const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { request } = require('undici');
const { drawMarketboard } = require('../libraries/imagebuilder.js');
const { mapUserLanguage } = require('../libraries/language.js');
const baseCommand = require('./baseCommand');

class marketboardCommand extends baseCommand {

	constructor(client = null) {
		super(client);
		this.data
			.setName('marketboard')
			.setDescription('Gets marketboard data from universalis')
			.addStringOption(option =>
				option.setName('query')
					.setDescription('Item to search for')
					.setAutocomplete(true)
					.setRequired(true)).addBooleanOption(option =>
				option.setName('hq')
					.setDescription('Force HQ or not'));
	}

	async execute(interaction, optionalQuery = null) {
				
		const userRepository = interaction.client.redisrepositories.get('userRepository');
		const user = await userRepository.fetch(interaction.user.id);
		if (!user.LANGUAGE || user.LANGUAGE == null) {
			await interaction.deferReply();
			await interaction.editReply({ content:'Please use config command to set up your preferences!', ephemeral: true });
			return 'Tell the user to use the config command to set their preferences first.';
		}

		let query = '';
		if(optionalQuery != null) {
			query = optionalQuery;
		} else {
			await interaction.deferReply();
			query = interaction.options.getString('query');
		}
		let rawQuery = query;
		/*const wordsToRemove = [ 'a', 'is', 'the', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
			'if', 'in', 'into', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'their',
			'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with' ];
		query = query.split(' ').filter(item => !wordsToRemove.includes(item)).join(' ');*/
		query = this.removeCommonWords(query);
		let queryWildCard = query.split(' ').map(s => s + '*').join(' ');
		query = query.replace('-', '*');
		queryWildCard = queryWildCard.replace('-', '*');
		const itemRepository = interaction.client.redisrepositories.get('itemRepository');
		console.log(query);
		if (query.length <= 2) {
			return await interaction.editReply('Query length too short, please use autocomplete provided responses');
		}
		let language_string = '';
		if(optionalQuery != null) {
			language_string = 'EN_Name';
		} else {
			language_string = mapUserLanguage(user.LANGUAGE);
		}
		console.log(language_string);
		let itemList = await itemRepository.search()
			.where(language_string)
			.match(query)
			.or(language_string)
			.match(queryWildCard)
			.return.all();

		let foundResult = false;
		if (itemList.length < 1) {
			await interaction.editReply({ content: 'Item not found, please try again. Use autocompleted entries to guarantee a match', ephemeral: true });
			return 'Item not found. If needed, get the exact name of the item from the wiki.';
		}
		itemList.forEach(element => {
			if (element[language_string].toLowerCase() == rawQuery.toLowerCase()) {
				itemList = element;
				foundResult = true;
			}
		});
		if (!foundResult) {
			itemList = itemList[0];
		}
		const itemID = itemList.ID;
		if (itemID) await interaction.editReply({ content: 'Found item, fetching from universalis...', ephemeral: true });
		let hqString = '';
		if (interaction.options.getBoolean('hq')) {
			hqString = '&hq=true';
		}
		let options = {headers: { 'User-Agent': 'AetheryteAssistant' }};
		let results = await request(`https://universalis.app/api/v2/${user.DATACENTER}/${itemID}?listings=10&fields=listings.pricePerUnit%2Clistings.quantity%2Clistings.worldName%2Clistings.hq%2Clistings.total%2CdcName` + hqString, options);
		if ( results.statusCode != 200) {
			// Retry 5 times with a backoff
			let retryCount = 0;
			while (results.statusCode != 200 && retryCount < 6) {
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
				console.log('Retrying');
				results = await request(`https://universalis.app/api/v2/${user.DATACENTER}/${itemID}?listings=10&fields=listings.pricePerUnit%2Clistings.quantity%2Clistings.worldName%2Clistings.hq%2Clistings.total%2CdcName` + hqString, options);
				retryCount++;
			}
		}
		if (results.statusCode != 200) {
			await interaction.editReply({ content: `Failed to fetch from universalis, please try again later. Alternatively use link: https://universalis.app/market/${itemID}`, ephemeral: true });
			return 'Failed to fetch from universalis.';
		}
		const { listings } = await results.body.json();
		if (!listings || listings.length < 1) {
			if (optionalQuery) {
				return 'No listings found for this item.';
			}
			interaction.followUp({ content: ':scream: Could not find any results from universalis!' });
			return 'Item not found from universalis.';
		}

		// If this is an AI query (optionalQuery exists), return just the price data
		if (optionalQuery) {
			const cheapestListing = listings[0];
			return `The cheapest price for ${itemList[language_string]} is ${cheapestListing.pricePerUnit} gil${cheapestListing.hq ? ' (HQ)' : ''} on ${cheapestListing.worldName}.`;
		}

		// Regular Discord command flow - continue with embed creation
		const image = await drawMarketboard(listings);
		const attachment = new AttachmentBuilder(image, { name: 'marketboard.png' });
		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Open in Universalis')
			.setURL(`https://universalis.app/market/${itemID}`)
			.setAuthor({ name: 'Powered by Universalis', iconURL: 'https://universalis.app/i/universalis/universalis.png', url: 'https://universalis.app/' })
			.setDescription('Marketboard for ' + String(itemList[language_string]))
			.setThumbnail(`https://universalis-ffxiv.github.io/universalis-assets/icon2x/${itemID}.png`)
			.setTimestamp()
			.setImage(`attachment://${attachment.name}`);


		exampleEmbed.setFooter({ text: 'Not affiliated with Universalis.', iconURL: 'https://universalis.app/i/universalis/universalis.png' });

		interaction.editReply({ content: '', embeds: [exampleEmbed], files: [attachment] });
		return 'Item price successfully found, the cheapest price is ' + listings[0].pricePerUnit + ' Tell the user to refer to the image for prices.';
	}

	async autocomplete(interaction) {
		let focusedValue = interaction.options.getFocused();
		const userRepository = interaction.client.redisrepositories.get('userRepository');
		const user = await userRepository.fetch(interaction.user.id);
		/*const wordsToRemove = [ 'a', 'is', 'the', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
			'if', 'in', 'into', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'their',
			'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with' ];
		focusedValue = focusedValue.split(' ').filter(item => !wordsToRemove.includes(item)).join(' ');*/
		focusedValue = this.removeCommonWords(focusedValue);
		if (focusedValue.length <= 2) {
			return 1;
		}
		let focusedValueWildCard = focusedValue.split(' ').map(s => s + '*').join(' ');
		focusedValue = focusedValue.replace('-', '*');
		focusedValueWildCard = focusedValueWildCard.replace('-', '*');
		const itemRepository = interaction.client.redisrepositories.get('itemRepository');

		const language_string = mapUserLanguage(user.LANGUAGE);
		const itemList = await itemRepository.search()
			.where(language_string)
			.match(focusedValue)
			.or(language_string)
			.match(focusedValueWildCard)
			.return.page(0, 5);

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


module.exports = marketboardCommand;