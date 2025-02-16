const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const { randomUUID } = require('crypto');
const BaseCommand = require('./baseCommand.js');
const { initializeModules, getFunctionDefinitions } = require('./functions/functionMap');

class creativeCommand extends BaseCommand {
	constructor(client = null) {
		super(client);
		this.data
			.setName('creative')
			.setDescription('AI Meant for more creative prompts. For example, "Write a backstory for my miqote named Yshtola".')
			.addStringOption(option =>
				option.setName('message')
					.setDescription('Your request')
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
		let creativeAssistantMessageLog = await this.creativeAssistantMessageLogRepository.fetch(interaction.user.id);
		const hasPremium = this.checkEntitlements(interaction);
		let prompt = 'You are a helpful assistant, named Aetheryte Assistant, talking in the style of Alphinaud from Final Fantasy 14. Your answers should relate to the game Final Fantasy 14. Ask the user clarifying questions as needed. Get information from the wiki to flesh out your answers.';
		if(hasPremium) {
			prompt = prompt + ' You can generate images.';
		} else {
			prompt = prompt + ' You do not have the premium features enabled. If asked to generate images, tell the user they can support the project to enable premium features.';
		}
		const baseMessage = { 'role': 'system', 'content': 'You are a helpful assistant, named Aetheryte Assistant, talking in the style of Alphinaud from Final Fantasy 14. Your answers should relate to the game Final Fantasy 14. Ask the user clarifying questions as needed. Get information from the wiki to flesh out your answers. You can generate images.' };
		const messages = [
			baseMessage,
		];
		const chatUUID = creativeAssistantMessageLog.MESSAGES != undefined ? creativeAssistantMessageLog.chatUUID : randomUUID();
		if (creativeAssistantMessageLog.MESSAGES) {
			for (const message in creativeAssistantMessageLog.MESSAGES) {
				messages.push(JSON.parse(creativeAssistantMessageLog.MESSAGES[message]));
			}
		}

		messages.push({ 'role': 'user', 'content': query });
		if (!creativeAssistantMessageLog.MESSAGES) {
			creativeAssistantMessageLog.MESSAGES = [JSON.stringify({ 'role': 'user', 'content': query })];
		}
		else {
			creativeAssistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'user', 'content': query }));
		}

		const functions_list = getFunctionDefinitions(hasPremium);

		console.log('Available functions:', functions_list.map(f => f.name));
		console.log('Has premium:', hasPremium);

		try {
			
			const model = hasPremium ? 'gpt-4o-2024-08-06' : 'gpt-4o-mini';
			let response = await openai.createChatCompletion({
				model: model,
				messages: messages,
				functions: functions_list,
				function_call: 'auto',
				temperature: 0.8,
				max_tokens: 300,
			});
			if (response.data.choices[0].finish_reason == 'function_call') {
				({ response, messageLog: creativeAssistantMessageLog } = await this.resolve_functions(
                    interaction, response, creativeAssistantMessageLog, messages, functions_list, openai, model
                ));
			}

			creativeAssistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'assistant', 'content': response.data.choices[0].message.content }));
			creativeAssistantMessageLog.chatUUID = chatUUID;
			await this.creativeAssistantMessageLogRepository.save(interaction.user.id, creativeAssistantMessageLog);
			await this.chatMessageLogRepository.save(chatUUID, creativeAssistantMessageLog);
			await this.creativeAssistantMessageLogRepository.expire(interaction.user.id, 300);
			await interaction.editReply(response.data.choices[0].message);
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

module.exports = creativeCommand;