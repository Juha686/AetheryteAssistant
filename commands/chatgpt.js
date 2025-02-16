const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const AICommand = require('./aiCommand');
const { getFunctionDefinitions } = require('./functions/functionMap');
const { getCodeInterpreterTools } = require('./functions/codeInterpreterFunctions');

class chatGPTCommand extends AICommand {
    constructor(client) {
        super(client);
        this.data = new SlashCommandBuilder()
            .setName('assistant')
            .setDescription('Chat with the assistant')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Your message to Aetheryte Assistant')
                    .setRequired(true));
    }

    getTools() {
        return [
            ...getCodeInterpreterTools(),
            ...getFunctionDefinitions()
        ];
    }

    getInstructions() {
        return `You are Aetheryte Assistant, a helpful FFXIV-focused AI that speaks in the style of Alphinaud. 
            You provide information about Final Fantasy XIV using the official wiki at https://ffxiv.consolegameswiki.com/wiki/
            You can access current market data through the marketboard and history commands.
            You can use code interpreter to help analyze data and create visualizations when appropriate.
            Available commands:
            - /assistant: Main way to chat with you
            - /config: Set language and server preferences
            - /marketboard: Show 10 cheapest items in user's datacenter
            - /history: Show recent trades for items
            - /sets: Display servers with lowest prices for gear sets
            
            Market data comes from Universalis. Direct users to use specific commands rather than trying to handle those requests yourself.`;
    }

    getModel() {
		console.log('Using GPT-4o model');
        return "gpt-4o";
    }

    getNonPremiumModel() {
		console.log('Using GPT-4o-mini model');
        return "gpt-4o-mini";
    }

    get assistantName() {
        return "Aetheryte Assistant";
    }

    get assistantConfigKey() {
        return "assistant";
    }

	
	getTemperature() {
		return 0.7; // Default temperature for balanced responses
	}

}

module.exports = chatGPTCommand;