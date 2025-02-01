const BaseCommand = require('./baseCommand');

class resetCommand extends BaseCommand {
	constructor(client = null) {
		super(client);
		this.data
			.setName('reset')
			.setDescription('Lets you reset your current conversation without waiting 5 minutes');
	}

	async execute(interaction) {
		await interaction.deferReply();
		await this.assistantMessageLogRepository.remove(interaction.user.id);
		await this.creativeAssistantMessageLogRepository.remove(interaction.user.id);
		await interaction.editReply('Assistant reset');
	}
}

module.exports = resetCommand;