/* eslint-disable comma-dangle */
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const baseCommand = require('./baseCommand');

class statisticsCommand extends baseCommand {

	constructor(client = null) {
		super(client);
		this.admin = true;
		this.data
			.setName('statistics')
			.setDescription('Shows usage for past 24h');
	}

	async execute(interaction) {
		await interaction.deferReply();

		let totalGuilds = 0;
		const promises = [];
		for (let i = 0; i < 5; i++) {
			promises.push(this.metricsRepository.fetch('guildCount:shard-' + i));
		}

		const results = await Promise.all(promises);
		let guildsPerShard = [];
		results.forEach((metrics, i) => {
			guildsPerShard.push(`Shard ${i} has ${metrics.COUNT} guilds`);
			totalGuilds += metrics.COUNT;
		});

		const embed = new EmbedBuilder()
			.setTitle('Statistics')
			.setDescription('Guild distribution across shards')
			.addFields({name: 'Total Guilds', value: totalGuilds.toString()})
			.addFields({name: 'Guilds Per Shard', value: guildsPerShard.join('\n')});

		interaction.editReply({ embeds: [embed] });
	}
}


module.exports = statisticsCommand;