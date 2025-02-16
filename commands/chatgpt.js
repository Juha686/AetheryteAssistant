const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const { randomUUID } = require('crypto');
const baseCommand = require('./baseCommand.js');
const { initializeModules, getFunctionDefinitions } = require('./functions/functionMap');

class chatGPTCommand extends baseCommand {

	constructor(client) {
		super(client);
		this.data = new SlashCommandBuilder()
			.setName('assistant')
			.setDescription('Chat with the assistant')
			.addStringOption(option =>
				option.setName('message')
					.setDescription('Your message to Atheryte Assistant')
					.setRequired(true));
	}

	async execute(interaction) {
		await interaction.deferReply();
		const configuration = new Configuration({
			apiKey: process.env.CHATGPT_API,
		});
		const openai = new OpenAIApi(configuration);

		initializeModules({ openai });

		const query = interaction.options.getString('message');
		let assistantMessageLog = await this.assistantMessageLogRepository.fetch(interaction.user.id);
		const baseMessage = { 'role': 'system', 'content': 'You are a helpful assistant, named Aetheryte Assistant, talking in the style of Alphinaud from Final Fantasy 14. Your answers should relate to the game Final Fantasy 14. You are a discord bot. You should utilise the wiki to provide most up to date answers. You also provide current market data for items through marketboard and history commands. You only have the following commands: assistant, config, marketboard, history, sets. The assistant command is the primary way to communicate with you. config command is used to set language, players data center and server information through a select menu. sets command shows the servers with lowest prices for each item piece. History command shows recent trades of the item. Marketboard command provides 10 cheapest items in your datacenter, and what server they are on. The commands are seperate, and assistant command is not used to access the other commands. Your source for market data is Universalis. Use https://ffxiv.consolegameswiki.com/wiki/' };
		const messages = [
			baseMessage,
		];
		const chatUUID = assistantMessageLog.MESSAGES != undefined ? assistantMessageLog.chatUUID : randomUUID();
		if (assistantMessageLog.MESSAGES) {
			for (const message in assistantMessageLog.MESSAGES) {
				messages.push(JSON.parse(assistantMessageLog.MESSAGES[message]));
			}
		}

		messages.push({ 'role': 'user', 'content': query });
		if (!assistantMessageLog.MESSAGES) {
			assistantMessageLog.MESSAGES = [JSON.stringify({ 'role': 'user', 'content': query })];
		}
		else {
			assistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'user', 'content': query }));
		}
		

		try {
			const hasPremium = this.checkEntitlements(interaction);
			const functions_list = getFunctionDefinitions(hasPremium);
			const model = hasPremium ? 'gpt-4o-2024-08-06' : 'gpt-4o-mini';
			console.log(model);
			let response = await openai.createChatCompletion({
				model: model,
				messages: messages,
				functions: functions_list,
				function_call: 'auto',
				temperature: 0.2,
				max_tokens: 300,
			});

			if (response.data.choices[0].finish_reason == 'function_call') {
				({ response, messageLog: assistantMessageLog } = await this.resolve_functions(
                    interaction, response, assistantMessageLog, messages, functions_list, openai, model
                ));
			}

			console.log(response.data.choices[0]);
			assistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'assistant', 'content': response.data.choices[0].message.content }));
			assistantMessageLog.chatUUID = chatUUID;
			await this.assistantMessageLogRepository.save(interaction.user.id, assistantMessageLog);
			await this.chatMessageLogRepository.save(chatUUID, assistantMessageLog);
			await this.assistantMessageLogRepository.expire(interaction.user.id, 300);

			await interaction.editReply(response.data.choices[0].message.content);
			if(response.data.finish_reason == 'length') {
				await interaction.followUp({
					content: `The response was shortened, use the 'more' keyword to get the rest of the response.`,
					ephemeral: true,
				});
			}
			//await this.postAdvert(interaction);
		}
		catch (error) {
			await this.handleOpenAIError(interaction, error);
		}
	}
}

module.exports = chatGPTCommand;