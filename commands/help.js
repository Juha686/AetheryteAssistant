const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const BaseCommand  = require('./baseCommand.js');

class helpCommand extends BaseCommand {

	constructor(client = null) {
		super(client);
		this.data
			.setName('help')
			.setDescription('Provides help on how to get started');
	}

	async execute(interaction) {

		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Help entries for Aetheryte Assistant')
			.setAuthor({ name: 'Powered by Universalis', iconURL: 'https://universalis.app/i/universalis/universalis.png', url: 'https://universalis.app/' })
			.setDescription('Help entry on how to get started.')
			.setThumbnail(interaction.client.user.displayAvatarURL())
			.setTimestamp();

		exampleEmbed.addFields({ name: '/config', value: 'Usage: `/config`\nDoing the config step is required to access every other command.' });

		exampleEmbed.addFields({ name: '/marketboard', value: 'Usage: /marketboard `query:Search string` `hq:True|False`\n Typing in the query parameter will provide autocompletions, and selecting an autocompletion is best way to interact with this command.' });
		exampleEmbed.addFields({ name: '/history', value: 'Usage: /history `query:Search string`\n Typing in the query parameter will provide autocompletions, and selecting an autocompletion is best way to interact with this command.' });
		exampleEmbed.addFields({ name: '/sets', value: 'Usage: /sets `query:Search string` `hq:true|false`\n Typing in the query parameter will provide autocompletions, and selecting an autocompletion is best way to interact with this command.' });
		exampleEmbed.addFields({ name: '/assistant', value: 'Usage: /assistant `message:Message to the assistant`\nSend messages to a FF14 assistant. Message history gets cleared 5 minutes after you stop interacting with the command.' });
		exampleEmbed.addFields({ name: '/creative', value: 'Usage: /creative `message:Message to the assistant`\n AI Meant for more creative prompts. If the answer cuts off, use "/creative continue" to generate more.' });
		exampleEmbed.addFields({ name: '/reset', value: 'Usage: /reset \nResets the message history of /assistant and /creative commands.' });
		exampleEmbed.addFields({ name: '/feedback', value: 'Usage: /feedback \nAdds a button that you can press to send feedback to the owner.' });
		exampleEmbed.addFields({ name: 'General information', value: 'We are looking for help in translating the bot to the following languages:\nGerman\nJapanese\nFrench\n\nIf you believe you can assist us with translations, please join the support server, or leave a message through the feedback command!' });
		exampleEmbed.setFooter({ text: 'Not affiliated with Universalis', iconURL: 'https://universalis.app/i/universalis/universalis.png' });

		interaction.reply({ content: '', embeds: [exampleEmbed] });
	}

}

module.exports = helpCommand;
