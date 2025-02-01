const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const BaseCommand  = require('./baseCommand.js');

class feedbackCommand extends BaseCommand {

	constructor(client = null) {
		super(client);
		this.data
			.setName('feedback')
			.setDescription('Give feedback about the bot, sent directly to the owner!');
	}

	async execute(interaction) {

		const feedbackEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Click here to send feedback to the owner of the bot.')
			.setDescription('We value your feedback. However, if you need support, please join the support discord: https://discord.gg/EtFK4EGvgz');
		const button = new ActionRowBuilder();
		button.addComponents(
			new ButtonBuilder()
				.setCustomId('feedback-button')
				.setStyle(ButtonStyle.Primary)
				.setLabel('Open form'),
		);
		interaction.reply({
			embeds: [feedbackEmbed],
			components: [button],
			ephemeral: true,
		});
	}

	async buttonExecute(interaction) {
		const feedbackModal = new ModalBuilder()
			.setCustomId('feedbackModal')
			.setTitle('Send feedback');

		const feedbackInput = new TextInputBuilder()
			.setCustomId('feedbackInput')
			.setLabel('Feedback to the owner')
			.setMinLength(10)
			.setMaxLength(1000)
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true);


		const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput);

		feedbackModal.addComponents(firstActionRow);

		await interaction.showModal(feedbackModal);
		const submitted = await interaction.awaitModalSubmit({
			time: 240 * 1000,
			filter: i => i.user.id === interaction.user.id,
		});

		const feedbackText = submitted.fields.getTextInputValue('feedbackInput');
		console.log(feedbackText);
		const channel = await submitted.client.channels.fetch(process.env.FEEDBACK_CHANNEL);
		const feedbackEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle(`Feedback from user ID ${submitted.user.id}`)
			.setAuthor({ name: submitted.user.tag, iconURL: submitted.user.displayAvatarURL() })
			.setThumbnail(submitted.user.displayAvatarURL())
			.setTimestamp()
			.addFields({ name: 'Guild', value: submitted.guild.name, inline: true })
			.addFields({ name: 'Guild ID', value: submitted.guild.id, inline: true })
			.addFields({ name: 'Feedback', value: feedbackText });
		await channel.send({ embeds: [feedbackEmbed] });
		await submitted.reply({
			content: 'Feedback received! Thank you :smile:',
			ephemeral: true,
		});
	}

}

module.exports = feedbackCommand;