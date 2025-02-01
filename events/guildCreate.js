const { Events, ActivityType } = require('discord.js');

module.exports = {
	name: Events.GuildCreate,
	once: false,
	async execute(guild) {
		console.log('Joined a new guild!');
	},
};
