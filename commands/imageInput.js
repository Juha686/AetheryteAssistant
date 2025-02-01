/*const baseCommand = require('./baseCommand');
const { Configuration, OpenAIApi } = require('openai');
const { randomUUID } = require('crypto');
const { request } = require('undici');
const { Collection } = require('discord.js');

class ImageInputCommand extends baseCommand {
    constructor(client = null) {
        super(client);
        this.data
            .setName('vision')
            .setDescription('Image input command')
            .addAttachmentOption(option =>
                option.setName('image')
                    .setDescription('The image to process')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Your request')
                    .setRequired(true));
    }
    async execute(interaction) {
        // Command logic goes here
        await interaction.deferReply();
        const image = interaction.options.getAttachment('image');
        console.log(image.url);
        const query = interaction.options.getString('message');
        const configuration = new Configuration({
			apiKey: process.env.CHATGPT_API,
		});
        const openai = new OpenAIApi(configuration);
        let assistantMessageLog = await this.assistantMessageLogRepository.fetch(interaction.user.id);
		const baseMessage = { 'role': 'system', 'content': 'You are a helpful assistant, named Aetheryte Assistant, talking in the style of Alphinaud from Final Fantasy 14. Your answers should relate to the game Final Fantasy 14. You are a discord bot. You have vision capabilities. Use https://ffxiv.consolegameswiki.com/wiki/' };
		const messages = [
			baseMessage,
		];
		const chatUUID = assistantMessageLog.MESSAGES != undefined ? assistantMessageLog.chatUUID : randomUUID();
		if (assistantMessageLog.MESSAGES) {
			for (const message in assistantMessageLog.MESSAGES) {
				messages.push(JSON.parse(assistantMessageLog.MESSAGES[message]));
			}
		}

        messages.push({
            'role': 'user',
            'content': [
                { 'type': 'text', 'text': query },
                { 'type': 'image_url', 'image_url': { 'url': image.url } }
            ]
        });
		if (!assistantMessageLog.MESSAGES) {
			assistantMessageLog.MESSAGES = [JSON.stringify({
                'role': 'user',
                'content': [
                    { 'type': 'text', 'text': query },
                    { 'type': 'image_url', 'image_url': { 'url': image.url } }
                ]
            })];
		}
		else {
			assistantMessageLog.MESSAGES.push(JSON.stringify({
                'role': 'user',
                'content': [
                    { 'type': 'text', 'text': query },
                    { 'type': 'image_url', 'image_url': { 'url': image.url } }
                ]
            }));
		}
        try {
            console.log(messages);
            let response = await openai.createChatCompletion({
                model: 'gpt-4o-mini',
                messages: messages,
                max_tokens: 16384,
            });
            console.log(response.data.choices[0]);
            assistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'assistant', 'content': response.data.choices[0].message.content }));
			assistantMessageLog.chatUUID = chatUUID;
            await this.assistantMessageLogRepository.save(interaction.user.id, assistantMessageLog);
			await this.chatMessageLogRepository.save(chatUUID, assistantMessageLog);
			await this.assistantMessageLogRepository.expire(interaction.user.id, 300);
            interaction.editReply(response.data.choices[0].message.content);
        }
        catch (error) {
			await interaction.editReply({
				content: 'Received error from OpenAI, you can retry the request or if the issue persists please contact us through the support discord found on my profile!',
				ephemeral: true,
			});
			if (error.response) {
				if (error.response.status == 400) {
					await interaction.followUp({
						content: 'Your chat might be exceeding the models maximum conversation length! Use the /reset command to start over.',
						ephemeral: true,
					});
				}

				console.log(error.response.status);
				console.log(error.response.data);
				// console.log(error.response);
			}
			else {
				console.log(error.message);
			}
		}
    }
}

module.exports = ImageInputCommand;
*/