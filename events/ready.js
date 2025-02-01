const { Events, ActivityType } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		// Every 5 seconds, update the bot's activity
		setInterval(async () => {
            const metricsRepository = client.redisrepositories.get('metricsRepository');
            // Get the count of guilds in metrics repository
            const metrics = await metricsRepository.fetch('guildCount:shard-' + client.shardId);
            
            metrics.COUNT = client.guilds.cache.size;
            await metricsRepository.save(metrics);

            let totalGuilds = 0;
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(metricsRepository.fetch('guildCount:shard-' + i));
            }

            const results = await Promise.all(promises);
            results.forEach((metrics, i) => {
                //console.log(`Shard ${i} has ${metrics.COUNT} guilds`);
                totalGuilds += metrics.COUNT;
            });

            client.user.setActivity(`${totalGuilds} servers`, { type: ActivityType.Watching });
        }, 1000 * 5);
	},
};
