const { SlashCommandBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const { randomUUID } = require('crypto');
const { request } = require('undici');
const baseCommand = require('./baseCommand.js');

async function get_info_from_wiki(content) {
	const results = await request(`https://ffxiv.consolegameswiki.com/mediawiki/api.php?action=parse&prop=wikitext&formatversion=2&format=json&page=${content}`);
	const { parse } = await results.body.json();

	if (typeof parse !== 'undefined') {
		if (parse.wikitext.length > 20000) {
			return 'Wiki page was too long and it was shortened. For full page, check the wiki page: https://ffxiv.consolegameswiki.com/wiki/' + content + " " + parse.wikitext.substring(0, 20000);
		}
		return parse.wikitext;
	}
	else {
		console.log('Page not found');
		return 'Page not found';
	}
}
async function search_the_wiki(interaction, content) {
	console.log(content);
	const results = await request(`https://ffxiv.consolegameswiki.com/mediawiki/api.php?action=query&list=search&utf8=&format=json&srsearch=${content}`);
	const { query } = await results.body.json();

	if (typeof query !== 'undefined') {
		if (query.length > 20000) {
			console.log('Too long');
			return 'Wiki page too long';
		}
		if (query.searchinfo.totalhits == 0) {
			console.log(query);
			return 'No results found with search terms "' + content + '" .Try searching with different keywords or remove the word "set"';
		}
		return JSON.stringify(query);
	}
	else {
		console.log('Page not found');
		return 'Page not found';
	}
}
async function get_set_info(interaction, content) {
	console.log(content);
	const itemRepository = interaction.client.redisrepositories.get('itemRepository');

	const wordsToRemove = ['a', 'is', 'the', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
	'if', 'in', 'into', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'their',
	'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
	content.split(' ').filter(item => !wordsToRemove.includes(item)).join(' ');
	content = content.split(' ').map(s => s + '*').join(' ');
	const itemList = await itemRepository.search()
		.where('EN_Name')
		.match(content)
		.sortDescending('LEVELITEM')
		.return.all();

	let result = '';
	for (const val of itemList) {
		const resultSet = val['EN_Name'].split(' ');
		if (resultSet[2] == 'of' && typeof val.LEVELITEM != 'undefined' && result === '') {
			result = `This is the highest item level set found. Item level: ${val.LEVELITEM} | ${resultSet[0]} ${resultSet[resultSet.length - 1]} set`;
		}
	}
	console.log(result);
	if (!result) {
		result = 'Check the wiki for which armour set to search for';
	}
	return result;
}

async function marketboard(interaction, query) {
	const marketboard_command = interaction.client.commands.get('marketboard');
	const answer = await marketboard_command.execute(interaction, query);
	console.log(answer);
	return answer;
}

async function sets(interaction, query) {
	const sets_command = interaction.client.commands.get('sets');
	const answer = await sets_command.execute(interaction, query);
	console.log(answer);
	return answer;
}
const functionMap = {
	'get_info_from_wiki': (args) => get_info_from_wiki(args.page),
	'get_set_information': (args, interaction) => get_set_info(interaction, args.equipment_suffix),
	'search_the_wiki': (args, interaction) => search_the_wiki(interaction, args.what_to_search),
	'marketboard': (args, interaction) => marketboard(interaction, args.item),
	'sets': (args, interaction) => sets(interaction, args.set)
};

async function resolve_functions(interaction, response, assistantMessageLog, messages, functions_list, openai, model) {
	console.log(response.data.choices[0]);
	const function_call = response.data.choices[0].message.function_call;
	if (response.data.choices[0].message.content != null) {
		await interaction.editReply(response.data.choices[0].message.content);
	}

	const func = functionMap[function_call.name];
	if (func) {
		const func_arguments = JSON.parse(function_call.arguments);
		try {
			function_call.results = await func(func_arguments, interaction);
		} catch (error) {
			console.error(`Error executing function ${function_call.name}:`, error);
			function_call.results = 'An error occurred while executing the function.';
		}
	} else {
		function_call.results = 'This function doesnt exist. Advise user to use other commands.';
	}

	if (response.data.choices[0].message.content != null) {
		await interaction.editReply(response.data.choices[0].message.content);
	} else {
		await interaction.editReply('Thinking');
	}
	console.log({ 'role': 'function', 'name': function_call.name, 'content': function_call.results });
	messages.push({ 'role': 'function', 'name': function_call.name, 'content': function_call.results });

	assistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'function', 'name': function_call.name, 'content': function_call.results }));
	response = await openai.createChatCompletion({
		model: model,
		messages: messages,
		functions: functions_list,
		function_call: 'auto',
		temperature: 0.2,
		max_tokens: 300,
	});

	if (response.data.choices[0].finish_reason == 'function_call') {
		({ response, assistantMessageLog } = await resolve_functions(interaction, response, assistantMessageLog, messages, functions_list, openai));
	}
	return { response: response, assistantMessageLog: assistantMessageLog };
}

// function that builds a function object for chatgpt
function buildFunctionObject(name, description, parameters) {
	return {
		'name': name,
		'description': description,
		'parameters': parameters,
	};
}



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
		const functions_list = [];
		functions_list.push(
			buildFunctionObject('get_info_from_wiki', 'Get up to date information from the final fantasy 14 wiki.', {
				'type': 'object',
				'properties': {
					'page': {
						'type': 'string',
						'description': 'The wiki page to get the information of. Infer this from the users question.',
					},
				},
				'required': ['page'],
			}),
		);

		functions_list.push(
			buildFunctionObject('search_the_wiki', 'Find pages from the wiki. Title is the page string used in other functions.', {
				'type': 'object',
				'properties': {
					'what_to_search': {
						'type': 'string',
						'description': 'What to search from the wiki.',
					},
				},
				'required': ['what_to_search'],
			}),
		);
		functions_list.push(
			buildFunctionObject('marketboard', 'Get current price of items from the marketboard. Posts the answer as seperate message.', {
				'type': 'object',
				'properties': {
					'item': {
						'type': 'string',
						'description': 'What item to get price of',
					},
				},
				'required': ['item'],
			}),
		);
		functions_list.push(
			buildFunctionObject('sets', 'Get current price of sets from the sets command. Posts the answer as seperate message.', {
				'type': 'object',
				'properties': {
					'set': {
						'type': 'string',
						'description': 'What set to get price of. For best results, use get_set_information function to get the set name.',
					},
				},
				'required': ['set'],
			}),
		);
		functions_list.push(
			buildFunctionObject('get_set_information', 'Gets information about best tradeable items in final fantasy 14. Use this to get the set name for the sets function.', {
				'type': 'object',
				'properties': {
					'equipment_suffix': {
						'type': 'string',
						'description': 'The ending of the equipment used. For example "of Maiming" or "of Slaying". Infer this from the info acquired from the wiki.',
					},
				},
				'required': ['equipment_suffix'],
			}),
		);

		try {
			const hasPremium = this.checkEntitlements(interaction);
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
				({ response, assistantMessageLog } = await resolve_functions(interaction, response, assistantMessageLog, messages, functions_list, openai, model));
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
			await this.postAdvert(interaction);
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

module.exports = chatGPTCommand;