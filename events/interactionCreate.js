const { Events } = require('discord.js');
const { logCommandToTS } = require('../libraries/redisTimeSeries.js');
module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
				console.log('Ran command' + interaction.commandName);
				logCommandToTS(interaction.commandName, interaction.client.Redis);
			}
			catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		}
		else if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.autocomplete(interaction);
			}
			catch (error) {
				console.error(error);
			}
		}
		else if (interaction.isButton()) {
			if (interaction.customId === 'feedback-button') {
				const command = interaction.client.commands.get('feedback');
				command.buttonExecute(interaction);
			}
		}
	},
};
