const { Events, ActivityType } = require('discord.js');

module.exports = {
	name: Events.GuildDelete,
	once: false,
	async execute(guild) {
		console.log('Left a guild!');
	},
};
