const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { request } = require('undici');
const { drawHistory } = require('../libraries/imagebuilder.js');
const { mapUserLanguage } = require('../libraries/language.js');
const BaseCommand = require('./baseCommand.js');

class HistoryCommand extends BaseCommand {
	constructor(client = null) {
		super(client);
		this.data
			.setName('history')
			.setDescription('Gets history data from universalis')
			.addStringOption(option =>
				option.setName('query')
					.setDescription('Item to search for')
					.setAutocomplete(true)
					.setRequired(true));

	}

	async execute(interaction) {
		await interaction.deferReply();
		const user = await this.userRepository.fetch(interaction.user.id);
		if (!user.LANGUAGE || user.LANGUAGE == null) return await interaction.reply({ content:'Please use config command to set up your preferences!', ephemeral: true });

		let query = interaction.options.getString('query');
		let rawQuery = query;
		query = this.removeCommonWords(query);
		let queryWildCard = query.split(' ').map(s => s + '*').join(' ');
		query = query.replace('-', '*');
		queryWildCard = queryWildCard.replace('-', '*');
		console.log(query);
		if (query.length <= 2) {
			return await interaction.editReply('Query length too short, please use autocomplete provided responses');
		}
		const language_string = mapUserLanguage(user.LANGUAGE);
		let itemList = [];

		try {
			const directMatch = await this.itemRepository.searchRaw(
				`@${language_string}:"${rawQuery}"`
			).return.all();
		
			if (directMatch.length > 0) {
				itemList = directMatch;
			} else {
				// Only try fuzzy search if exact match fails
				const terms = rawQuery.split(' ');
				const fuzzyQuery = `@${language_string}:(${terms.map(term => `*${term}*`).join('|')})`;
				console.log('Attempting fuzzy search with:', fuzzyQuery);
				const fuzzyResults = await this.itemRepository.searchRaw(fuzzyQuery).return.all();
				itemList = fuzzyResults;
				console.log('Fuzzy search results:', itemList.length);
			}
		} catch (error) {
			console.error('Redis search error:', error);
			throw error;
		}

		let foundResult = false;
		if (!itemList) await interaction.editReply({ content: 'Item not found, please try again. Use autocompleted entries to guarantee a match', ephemeral: true });
		itemList.forEach(element => {
			if (element[language_string].toLowerCase() == interaction.options.getString('query').toLowerCase()) {
				itemList = element;
				foundResult = true;
			}
		});
		if (!foundResult) {
			itemList = itemList[0];
		}
		const itemID = itemList.ID;
		if (itemID) await interaction.editReply({ content: 'Found item, fetching from universalis...', ephemeral: true });
		let options = {headers: { 'User-Agent': 'AetheryteAssistant' }};
		let results = await request(`https://universalis.app/api/v2/history/${user.DATACENTER}/${itemID}?entriesToReturn=10`, options);
		if (results.statusCode != 200) {
			// Retry 5 times with a backoff
			let retryCount = 0;
			while (results.statusCode != 200 && retryCount < 5) {
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
				results = await request(`https://universalis.app/api/v2/history/${user.DATACENTER}/${itemID}?entriesToReturn=10`, options);
				retryCount++;
			}
		}
		if (results.statusCode != 200) {
			await interaction.editReply({ content: `Failed to fetch from universalis, please try again later. Alternatively use link: https://universalis.app/market/${itemID}`, ephemeral: true });
			return 'Failed to fetch from universalis.';
		}
			
		const { entries: listings } = await results.body.json();
		if (!listings || listings.length < 1) {
			interaction.followUp({ content: ':scream: Could not find any results from universalis!' });
			return 1;
		}
		const image = await drawHistory(listings);
		const attachment = new AttachmentBuilder(image, { name: 'marketboard.png' });
		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Open in Universalis')
			.setURL(`https://universalis.app/market/${itemID}`)
			.setAuthor({ name: 'Powered by Universalis', iconURL: 'https://universalis.app/i/universalis/universalis.png', url: 'https://universalis.app/' })
			.setDescription('History data for ' + String(itemList[language_string]))
			.setThumbnail(`https://universalis-ffxiv.github.io/universalis-assets/icon2x/${itemID}.png`)
			.setTimestamp()
			.setImage(`attachment://${attachment.name}`);

		exampleEmbed.setFooter({ text: 'Not affiliated with Universalis', iconURL: 'https://universalis.app/i/universalis/universalis.png' });

		interaction.editReply({ content: '', embeds: [exampleEmbed], files: [attachment] });
	}

	async autocomplete(interaction) {
		let focusedValue = interaction.options.getFocused();
		const user = await this.userRepository.fetch(interaction.user.id);
		focusedValue = this.removeCommonWords(focusedValue);
		if (focusedValue.length <= 2) {
			return 1;
		}
		let rawQuery = focusedValue;
		let focusedValueWildCard = focusedValue.split(' ').map(s => s + '*').join(' ');
		focusedValue = focusedValue.replace('-', '*');
		focusedValueWildCard = focusedValueWildCard.replace('-', '*');

		const language_string = mapUserLanguage(user.LANGUAGE);
		let itemList = [];

		try {
			const directMatch = await this.itemRepository.searchRaw(
				`@${language_string}:"${rawQuery}"`
			).return.all();
		
			if (directMatch.length > 0) {
				itemList = directMatch;
			} else {
				// Only try fuzzy search if exact match fails
				const terms = rawQuery.split(' ');
				const fuzzyQuery = `@${language_string}:(${terms.map(term => `*${term}*`).join('|')})`;
				console.log('Attempting fuzzy search with:', fuzzyQuery);
				const fuzzyResults = await this.itemRepository.searchRaw(fuzzyQuery).return.all();
				itemList = fuzzyResults;
				console.log('Fuzzy search results:', itemList.length);
			}
		} catch (error) {
			console.error('Redis search error:', error);
			throw error;
		}

		const resultListing = [];
		for (const val of itemList) {
			if (resultListing.length < 5) {
				resultListing.push(val[language_string]);
			}
			else {
				break;
			}
		}
		const resultMap = resultListing.map(choice => ({ name: choice, value: choice }));
		await interaction.respond(resultMap);
	}
}

module.exports = HistoryCommand;