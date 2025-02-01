const baseCommand = require('./baseCommand');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');

class checkPremiumCommand extends baseCommand {

    constructor(client = null) {
        super(client);
        this.data
            .setName('check_premium')
            .setDescription('Validates premium status for a user')
    }

    async execute(interaction) {
        await interaction.deferReply();

        const hasPremium = this.checkEntitlements(interaction);
        if(hasPremium) {
            interaction.editReply({ content: 'Premium status enabled. Thank you for your support!', ephemeral: true });
        } else {         
            interaction.editReply({ content: 'Premium status not enabled. Enter the store through the bots profile to purchase! You get access to latest AI model, and image generation.', ephemeral: true });
        }
        
    }
}

module.exports = checkPremiumCommand;