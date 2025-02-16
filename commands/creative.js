const { SlashCommandBuilder } = require('discord.js');
const AICommand = require('./aiCommand');
const { getFunctionDefinitions } = require('./functions/functionMap');

class CreativeCommand extends AICommand {
    constructor(client) {
        super(client);
        this.data = new SlashCommandBuilder()
            .setName('creative')
            .setDescription('AI Meant for more creative prompts. For example, "Write a backstory for my miqote named Yshtola".')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Your request')
                    .setRequired(true));
    }

    getTools() {
        return getFunctionDefinitions();
    }

    getInstructions() {
        return `You are a creative writing assistant for Final Fantasy XIV, speaking in the style of Alphinaud.
            Focus on creating engaging narratives, character backstories, and descriptive scenes.
            Your responses should be creative while staying true to FFXIV lore and setting.
            Draw from the official wiki at https://ffxiv.consolegameswiki.com/wiki/ for accuracy.
            
            When writing:
            - Use rich, descriptive language
            - Include relevant FFXIV terminology and locations
            - Maintain consistency with game lore
            - Create engaging character interactions
            - Reference relevant in-game events when appropriate
            
            If asked to generate images, you can do so for premium users.
            For non-premium users, inform them about supporting the project to enable premium features.`;
    }

    getModel() {
        return "gpt-4o";
    }

    getNonPremiumModel() {
        return "gpt-4o-mini";
    }

    get assistantName() {
        return "Creative Aetheryte Assistant";
    }

    get assistantConfigKey() {
        return "creative_assistant";
    }

	getTemperature() {
		return 0.9; // Creative temperature for more imaginative responses
	}
}

module.exports = CreativeCommand;