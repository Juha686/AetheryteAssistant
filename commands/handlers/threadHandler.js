const { AttachmentBuilder } = require('discord.js');

class ThreadHandler {
    constructor(openai, userRepository) {
        this.openai = openai;
        this.userRepository = userRepository;
    }

    async getThread(userId, assistantKey) {
        const user = await this.userRepository.fetch(userId);
        
        // Parse threads from JSON string or initialize empty object
        let threadsMap = {};
        try {
            if (user.threads) {
                threadsMap = JSON.parse(user.threads);
            }
        } catch (error) {
            console.error('Error parsing threads:', error);
        }

        const threadInfo = threadsMap[assistantKey];
        
        if (!threadInfo) {
            const thread = await this.openai.beta.threads.create();
            threadsMap[assistantKey] = {
                id: thread.id
            };
            user.threads = JSON.stringify(threadsMap);
            await this.userRepository.save(user);
        }
        
        return threadsMap[assistantKey].id;
    }

    async processContent(content, interaction) {
        console.log('Content:', content);
        if (content.type === 'text') {
            const chunks = this.splitMessage(content.text.value);
            await interaction.editReply(chunks[0]);
            
            for (let i = 1; i < chunks.length; i++) {
                await interaction.followUp(chunks[i]);
            }
        } else if (content.type === 'image_file') {
            try {
                const imageResponse = await this.openai.files.content(content.image_file.file_id);
                const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
                
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'graph.png' });
                await interaction.editReply({ 
                    files: [attachment],
                    embeds: [] 
                });
            } catch (error) {
                console.error('Error fetching image:', error);
                await interaction.editReply({ 
                    content: 'Error: Could not load the generated image',
                    embeds: []
                });
            }
        }
    }

    splitMessage(message, maxLength = 1900) {
        if (message.length <= maxLength) return [message];
        
        const chunks = [];
        let current = '';
        const lines = message.split('\n');
        
        for (const line of lines) {
            if (current.length + line.length + 1 > maxLength) {
                chunks.push(current);
                current = line;
            } else {
                current = current ? `${current}\n${line}` : line;
            }
        }
        
        if (current) chunks.push(current);
        return chunks;
    }
}

module.exports = ThreadHandler;