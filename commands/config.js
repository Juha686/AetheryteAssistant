const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, Collection } = require('discord.js');
const { request } = require('undici');
const BaseCommand  = require('./baseCommand.js');

class configCommand extends BaseCommand {
	constructor(client = null) {
		super(client);
		this.data
			.setName('config')
			.setDescription('Set your datacenter and server');
	}

	async execute(interaction) {
		await interaction.deferReply({ephemeral: true});
		const actionRowCollection = new Collection();
		const dataCenterSelectionBuilder = new StringSelectMenuBuilder()
			.setCustomId('datacenter-select')
			.setPlaceholder('Select your datacenter preference');
		let options = {headers: { 'User-Agent': 'AetheryteAssistant' }};
		let dataCenterResults = await request('https://universalis.app/api/v2/data-centers', options);
		if(dataCenterResults.statusCode != 200) {
			// Retry 5 times with a backoff
			let retryCount = 0;
			while(dataCenterResults.statusCode != 200 && retryCount < 6) {
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
				dataCenterResults = await request('https://universalis.app/api/v2/data-centers', options);
				retryCount++;
			}	
		}
		if(dataCenterResults.statusCode != 200) {
			return interaction.editReply('Failed to retrieve datacenters, please try again later');
		}
		const dataCenterData = await dataCenterResults.body.json();
		for (const dataCenter in dataCenterData) {
			dataCenterSelectionBuilder
				.addOptions({ label: dataCenterData[dataCenter].name, description: `Region: ${dataCenterData[dataCenter].region}`, value: dataCenterData[dataCenter].name });
		}

		const serverSelectionBuilder = new StringSelectMenuBuilder()
			.setCustomId('server-select')
			.setPlaceholder('Select your server preference');

		let serverResults = await request('https://universalis.app/api/v2/worlds', options);
		if(serverResults.statusCode != 200) {
			// Retry 5 times with a backoff
			let retryCount = 0;
			while(serverResults.statusCode != 200 && retryCount < 6) {
				await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
				serverResults = await request('https://universalis.app/api/v2/worlds', options);
				retryCount++;
			}	
		}
		if(serverResults.statusCode != 200) {
			return interaction.editReply('Failed to retrieve servers, please try again later');
		}
		const serverData = await serverResults.body.json();
		const dataCenterRow = new ActionRowBuilder()
		.addComponents(
			dataCenterSelectionBuilder,
		);

		const languageRow = new ActionRowBuilder()
			.addComponents(
				new StringSelectMenuBuilder()
					.setCustomId('language-select')
					.setPlaceholder('Select your language preference')
					.addOptions(
						{
							label: 'English',
							description: 'English',
							value: 'English',
						},
						{
							label: 'German',
							description: 'German',
							value: 'German',
						},
						{
							label: 'Japanese',
							description: 'Japanese',
							value: 'Japanese',
						},
						{
							label: 'French',
							description: 'French',
							value: 'French',
						},
					),
			);

		actionRowCollection.set('language', languageRow);
		actionRowCollection.set('datacenter', dataCenterRow);
		const configMessage = await interaction.editReply({ components: actionRowCollection, fetchReply: true});
		// await interaction.followUp({ components: actionRowCollection, fetchReply: true, ephemeral: true });
		const filter = i => {
			return i.user.id === interaction.user.id;
		};
		const collector = configMessage.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 1500000 });
		let collectedResponses = 0;
		collector.on('collect', i => {
			collectedResponses++;
			if (collectedResponses == 3) {
				collector.stop();
				return;
			}
			switch (i.customId) {
				case 'datacenter-select': {
					actionRowCollection.delete('datacenter');
					const selectedDataCenter = dataCenterData.find(itemDataCenter => itemDataCenter.name == i.values[0]);
					for (const gameServer in serverData) {
						if (selectedDataCenter.worlds.includes(Number(serverData[gameServer].id))) {
							serverSelectionBuilder
								.addOptions({ label: serverData[gameServer].name, value: serverData[gameServer].name });
						}
					}
					const serverRow = new ActionRowBuilder()
						.addComponents(
							serverSelectionBuilder,
						);
					actionRowCollection.set('server', serverRow);
					i.update({
						content: `Datacenter selection was ${i.values[0]}, please finish config`,
						components: actionRowCollection,
					});
					break;
				}
				case 'server-select': {
					actionRowCollection.delete('server');
					i.update({
						content: `Server selection was ${i.values[0]}, please finish config`,
						components: actionRowCollection,
					});
					break;
				}
				case 'language-select': {
					actionRowCollection.delete('language');
					i.update({
						content: `Language selection was ${i.values[0]}, please finish config`,
						components: actionRowCollection,
					});
					break;
				}
			}
		});

		collector.on('end', collected => {
			let server = '';
			let language = '';
			let dataCenter = '';
			collected.forEach((collectedInteraction) => {
				switch (collectedInteraction.customId) {
					case 'datacenter-select': {
						dataCenter = collectedInteraction.values[0];
						break;
					}
					case 'server-select': {
						server = collectedInteraction.values[0];
						break;
					}
					case 'language-select': {
						language = collectedInteraction.values[0];
						break;
					}
				}
			});
			const userRepository = interaction.client.redisrepositories.get('userRepository');
			userRepository.save(collected.first().user.id, {
				ID: collected.first().user.id,
				DATACENTER: dataCenter,
				SERVER: server,
				LANGUAGE: language,
			});

			interaction.editReply({ content: `Datacenter was set to ${dataCenter}, server was set to ${server} and language preference set to ${language}`, components: [] });
			if (language != 'English') {
				switch (language) {
					case 'German': {
						interaction.followUp({ content: 'Bitte beachten Sie, dass Unterstützung für andere Sprachen als Englisch in Arbeit ist', ephemeral: true });
						break;
					}
					case 'Japanese': {
						interaction.followUp({ content: '英語以外の言語のサポートは進行中ですのでご注意ください', ephemeral: true });
						break;
					}
					case 'French': {
						// eslint-disable-next-line quotes
						interaction.followUp({ content: `Veuillez noter que la prise en charge de langues autres que l'anglais est en cours`, ephemeral: true });
						break;
					}
				}
			}
			console.log(`Collected ${collected.size} interactions.`);
		});
	}
}

module.exports = configCommand;