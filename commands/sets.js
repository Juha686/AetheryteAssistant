const { SlashCommandBuilder, EmbedBuilder, Collection, AttachmentBuilder } = require('discord.js');
const { request } = require('undici');
const { drawItemSets } = require('../libraries/imagebuilder.js');
const { mapUserLanguage } = require('../libraries/language.js');
const baseCommand = require('./baseCommand');

class setsCommand extends baseCommand {

	constructor(client = null) {
		super(client);
		this.data
			.setName('sets')
			.setDescription('Gets marketboard data from universalis for sets of items')
			.addStringOption(option =>
				option.setName('query')
					.setDescription('Set to search for')
					.setAutocomplete(true)
					.setRequired(true))
			.addBooleanOption(option =>
				option.setName('hq')
					.setDescription('Force HQ or not'));
	}

	async execute(interaction, optionalQuery = null) {
		const user = await this.userRepository.fetch(interaction.user.id);
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
		if (query.includes('|')) {query = query.split('|')[1].trim();}
		const queryUi = query;
		/*const wordsToRemove = [ 'a', 'is', 'the', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
			'if', 'in', 'into', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'their',
			'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
		query = query.split(' ').filter(item => !wordsToRemove.includes(item)).join(' ');*/
		query = this.removeCommonWords(query);
		if(query.toLowerCase().includes('set')) {
			query = query.slice(0, -4);
		}
		let queryWildCard = query.split(' ').map(s => s + '*').join(' ');
		query = query.replace('-', '*');
		queryWildCard = queryWildCard.replace('-', '*');
		console.log(query);
		if (query.length <= 2) {
			await interaction.editReply('Query length too short, please use autocomplete provided responses');
			return 'Query length too short, please ask the user for what to search';
		}
		let language_string = '';
		if(optionalQuery != null) {
			language_string = 'EN_Name';
			user.LANGUAGE = 'English';
		} else {
			language_string = mapUserLanguage(user.LANGUAGE);
		}
		console.log(language_string);
		const itemList = await this.itemRepository.search()
			.where(language_string)
			.match(query)
			.or(language_string)
			.match(queryWildCard)
			.return.all();
		if (itemList.length < 1) {
			await interaction.editReply({ content: 'Item not found, please try again. Use autocompleted entries to guarantee a match', ephemeral: true });
			return 'Item not found. Get the exact name of the item from the wiki.';
		}
		let idList = '';
		console.log(idList);
		itemList.forEach((itemIteration) => {
			if (user.LANGUAGE == 'Japanese') {
				if (itemIteration[language_string].split('・')[0].split('-')[0].includes(query.split('・')[0].split('*')[0])) {
					idList += itemIteration.ID + ',';
				}
			}
			else if (itemIteration[language_string].split(' ')[0].split('-')[0].includes(query.split(' ')[0].split('*')[0])) {
				idList += itemIteration.ID + ',';
			}

		});

		idList = String(idList).slice(0, -1);

		if (idList) await interaction.editReply({ content: 'Found item, fetching from universalis...', ephemeral: true });
		let hqString = '';
		if (interaction.options.getBoolean('hq')) {
			hqString = '&hq=true';
		}
		if(optionalQuery != null) {
			hqString = '&hq=true';
		}
		let options = {headers: { 'User-Agent': 'AetheryteAssistant' }};
		let results = await request(`https://universalis.app/api/v2/${user.DATACENTER}/${idList}?listings=5&fields=items.itemID%2Citems.listings.pricePerUnit%2Citems.listings.quantity%2Citems.listings.worldName%2Citems.listings.hq%2Citems.listings.total%2CdcName` + hqString, options);
		if (results.statusCode !== 200) {
			// Retry 5 times with a backoff
			let retryCount = 0;
			while (results.statusCode !== 200 && retryCount < 5) {
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
				results = await request(`https://universalis.app/api/v2/${user.DATACENTER}/${idList}?listings=5&fields=items.itemID%2Citems.listings.pricePerUnit%2Citems.listings.quantity%2Citems.listings.worldName%2Citems.listings.hq%2Citems.listings.total%2CdcName` + hqString, options);
				retryCount++;
			}
		}
		if (results.statusCode != 200) {
			await interaction.editReply({ content: `Failed to fetch from universalis, please try again later.`, ephemeral: true });
			return 'Failed to fetch from universalis.';
		}
		const { items } = await results.body.json();
		if (!items || items.length < 1) {
			interaction.followUp({ content: ':scream: Could not find any results from universalis!' });
			return 'Item not found from universalis.';
		}
		const image = await drawItemSets(items, itemList, language_string);
		const attachment = new AttachmentBuilder(image, { name: 'sets.png' });
		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle(`${queryUi}`)
			.setURL('https://universalis.app/')
			.setAuthor({ name: 'Powered by Universalis', iconURL: 'https://universalis.app/i/universalis/universalis.png', url: 'https://universalis.app/' })
			.setDescription(`ilvl ${itemList[0].LEVELITEM} set. Sets command is an experimental feature with dynamically generated sets, and may not always be accurate.`)
			.setThumbnail('https://universalis.app/i/universalis/universalis.png')
			.setTimestamp()
			.setImage(`attachment://${attachment.name}`)
			.setFooter({ text: 'Not affiliated with Universalis.', iconURL: 'https://universalis.app/i/universalis/universalis.png' });
		interaction.editReply({ content: '', embeds: [exampleEmbed], files: [attachment] });
		return 'Set prices succesfully found and posted seperately. Tell the user to refer to the image for prices.';
	}

	async autocomplete(interaction) {
		let focusedValue = interaction.options.getFocused();
		const user = await this.userRepository.fetch(interaction.user.id);
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

		const language_string = mapUserLanguage(user.LANGUAGE);
		const itemList = await this.itemRepository.search()
			.where(language_string)
			.match(focusedValue)
			.or(language_string)
			.match(focusedValueWildCard)
			.sortDescending('LEVELITEM')
			.return.all();
		if (itemList.length < 1) {
			return 1;
		}

		const resultCollection = new Collection();
		for (const val of itemList) {
			if (resultCollection.size < 25) {
				const resultSet = val[language_string].split(' ');
				if (user.LANGUAGE == 'English' && resultSet[2] == 'of' && typeof val.LEVELITEM != 'undefined') {
					resultCollection.set(resultSet[0] + resultSet[resultSet.length - 1], val.LEVELITEM + ' | ' + resultSet[0] + ' ' + resultSet[resultSet.length - 1] + ' Set');
				}
				else if (user.LANGUAGE == 'German' && ((!val[language_string].includes('-') && resultSet[1] == 'der') || (val[language_string].includes('-') && resultSet[1] == 'der')) && typeof val.LEVELITEM != 'undefined') {
					resultCollection.set(resultSet[0].split('-')[0].substring(0, 6) + resultSet[resultSet.length - 1], val.LEVELITEM + ' | ' + resultSet[0].split('-')[0] + ' ' + resultSet[resultSet.length - 1] + ' Set');
				}
				else if (user.LANGUAGE != 'English' && user.LANGUAGE != 'German' && typeof val.LEVELITEM != 'undefined') {
					resultCollection.set(resultSet[0].split('-')[0] + resultSet[resultSet.length - 1], val.LEVELITEM + ' | ' + resultSet[0].split('-')[0] + ' ' + resultSet[resultSet.length - 1] + ' Set');
				}
			}
			else {
				break;
			}
		}

		const resultMap = resultCollection.map(choice => ({ name: choice, value: choice }));

		await interaction.respond(resultMap);
	}


};

module.exports = setsCommand;
