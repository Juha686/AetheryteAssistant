const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');
const { randomUUID } = require('crypto');
const { request } = require('undici');
const BaseCommand = require('./baseCommand.js');

async function get_info_from_wiki(content) {
	const results = await request(`https://ffxiv.consolegameswiki.com/mediawiki/api.php?action=parse&page=${content}&prop=wikitext&formatversion=2&format=json`);
	const { parse } = await results.body.json();

	if (typeof parse !== 'undefined') {
		if (parse.wikitext.length > 20000) {
			console.log('Too long');
			return 'Wiki page too long';
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
	const results = await request(`https://ffxiv.consolegameswiki.com/mediawiki/api.php?action=query&list=search&srsearch=${content}&utf8=&format=json`);
	const { query } = await results.body.json();

	if (typeof query !== 'undefined') {
		if (query.length > 20000) {
			console.log('Too long');
			return 'Wiki page too long';
		}
		if (query.searchinfo.totalhits == 0) {
			console.log(query);
			return 'Try searching without the "set" word or using different search terms';
		}
		return JSON.stringify(query);
	}
	else {
		console.log('Page not found');
		return 'Page not found';
	}
}

async function generate_image(interaction, content, openai) {
	console.log(content);
	const response = await openai.createImage({
		model: 'dall-e-3',
		prompt: 'I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: ' + content + ' Image should be stylised like the game Final Fantasy 14.',
		n: 1,
		size: '1024x1024',
	});
	console.log(response.data.data[0].revised_prompt);
	const image_url = response.data.data[0].url;

	if (typeof image_url !== 'undefined') {

		const attachment = new AttachmentBuilder(image_url, { name: 'image.png' });

		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Image')
			.setTimestamp()
			.setImage(`attachment://${attachment.name}`);

		interaction.followUp({ content: '', embeds: [exampleEmbed], files: [attachment] });
		return 'Image generated successfully and posted seperately.';
	}
	else {
		console.log('Page not found');
		return 'Image not found';
	}
}

const functionMap = {
	'get_info_from_wiki': (args) => get_info_from_wiki(args.page),
	'get_set_information': (args, interaction) => get_set_info(interaction, args.equipment_suffix),
	'search_the_wiki': (args, interaction) => search_the_wiki(interaction, args.what_to_search),
	'marketboard': (args, interaction) => marketboard(interaction, args.item),
	'sets': (args, interaction) => sets(interaction, args.set),
	'generate_image': (args, interaction, openai) => generate_image(interaction, args.prompt, openai),
};
async function resolve_functions(interaction, response, creativeAssistantMessageLog, messages, functions_list, openai, model) {
	console.log(response.data.choices[0]);
	const function_call = response.data.choices[0].message.function_call;
	if (function_call.name == 'generate_image') {
		functions_list = functions_list.filter(functions_list => functions_list.name !== 'generate_image');
	}
	if (response.data.choices[0].message.content != null) {
		await interaction.editReply(response.data.choices[0].message.content);
	}

	const func = functionMap[function_call.name];
	if (func) {
		const func_arguments = JSON.parse(function_call.arguments);
		try {
			if(function_call.name == 'generate_image') {
				function_call.results = await func(func_arguments, interaction, openai);
			} else {
				function_call.results = await func(func_arguments, interaction);
			}
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
	messages.push({ 'role': 'function', 'name': function_call.name, 'content': function_call.results });

	creativeAssistantMessageLog.MESSAGES.push(JSON.stringify({ 'role': 'function', 'name': function_call.name, 'content': function_call.results }));
	response = await openai.createChatCompletion({
		model: model,
		messages: messages,
		functions: functions_list,
		function_call: 'auto',
		temperature: 0.2,
		max_tokens: 300,
	});

	if (response.data.choices[0].finish_reason == 'function_call') {
		({ response, creativeAssistantMessageLog } = await resolve_functions(interaction, response, creativeAssistantMessageLog, messages, functions_list, openai));
	}
	return { response: response, creativeAssistantMessageLog: creativeAssistantMessageLog };
}

// function that builds a function object for chatgpt
function buildFunctionObject(name, description, parameters) {
	return {
		'name': name,
		'description': description,
		'parameters': parameters,
	};
}

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

		const functions_list = [];
		functions_list.push(buildFunctionObject('get_info_from_wiki', 'Get up to date information from the final fantasy 14 wiki. Use this function to get extra information for more thorough answers.', {
			'type': 'object',
			'properties': {
				'page': {
					'type': 'string',
					'description': 'The wiki page to get the information of. Infer this from the context.',
				},
			},
			'required': ['page'],
		}));
		functions_list.push(buildFunctionObject('search_the_wiki', 'Find pages from the wiki. Title is the page string used in other functions.', {
			'type': 'object',
			'properties': {
				'what_to_search': {
					'type': 'string',
					'description': 'What to search from the wiki.',
				},
			},
			'required': ['what_to_search'],
		}));
		if(hasPremium) {
			functions_list.push(buildFunctionObject('generate_image', 'Generate an image. Use this function to describe situations or context.', {
				'type': 'object',
				'properties': {
					'prompt': {
						'type': 'string',
						'description': 'Prompt for the image generating AI. Provide a detailed description.',
					},
				},
				'required': ['prompt'],
			}));
		}
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
				({ response, creativeAssistantMessageLog } = await resolve_functions(interaction, response, creativeAssistantMessageLog, messages, functions_list, openai, model));
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
			await this.postAdvert(interaction);
		}
		catch (error) {
			await interaction.editReply({
				content: 'Received error from OpenAI, you can retry the request or if the issue persists please contact us through the support discord found on my profile!',
				ephemeral: true,
			});
			if (error.response) {
				console.log(error.response.status);
				console.log(error.response.data);
			}
			else {
				console.log(error.message);
			}
		}


	}
}

module.exports = creativeCommand;