const BaseCommand = require('./baseCommand.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

class StatsCommand extends BaseCommand {
    constructor(client) {
        super(client);
        this.admin = true;
        this.data = new SlashCommandBuilder()
            .setName('stats')
            .setDescription('Shows command usage statistics')
            .addStringOption(option =>
                option.setName('timerange')
                    .setDescription('Time range for statistics')
                    .setRequired(false)
                    .addChoices(
                        { name: '24 Hours', value: '24h' },
                        { name: '7 Days', value: '7d' },
                        { name: '30 Days', value: '30d' },
                        { name: 'All Time', value: 'all' }
                    ));
    }

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const timerange = interaction.options.getString('timerange') || 'all';
            const redisClient = this.client.Redis;

            // Calculate time range in milliseconds
            const now = Date.now();
            const timeRanges = {
                '24h': now - (24 * 60 * 60 * 1000),
                '7d': now - (7 * 24 * 60 * 60 * 1000),
                '30d': now - (30 * 24 * 60 * 60 * 1000),
                'all': 0
            };

            const fromTimestamp = timeRanges[timerange];

            // Get all time series keys
            const keys = await redisClient.keys('*');
            const commandKeys = keys.filter(key => key !== 'commands' && !key.includes(':'));

            // Get stats for each command
            const stats = await Promise.all(commandKeys.map(async (command) => {
                let count;
                if (timerange === 'all') {
                    const info = await redisClient.ts.info(command);
                    count = info.totalSamples || 0;
                } else {
                    // Get samples within time range
                    const samples = await redisClient.ts.range(command, fromTimestamp, '+');
                    count = samples.length;
                }
                return {
                    name: command,
                    count: count
                };
            }));

            // Sort by usage count
            stats.sort((a, b) => b.count - a.count);

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`Command Usage Statistics ${timerange !== 'all' ? `(Last ${timerange})` : '(All Time)'}`)
                .setColor('#0099ff')
                .setTimestamp();

            // Add fields for each command
            stats.forEach(stat => {
                embed.addFields({
                    name: stat.name,
                    value: `Used ${stat.count} times`,
                    inline: true
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching stats:', error);
            await interaction.editReply('Sorry, there was an error fetching the statistics.');
        }
    }
}

module.exports = StatsCommand;