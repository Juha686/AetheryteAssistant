const baseCommand = require('./baseCommand');
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');

class validateEntitlementCommand extends baseCommand {

    constructor(client = null) {
        super(client);
        this.admin = true;
        this.data
            .setName('validate_entitlement')
            .setDescription('Validates entitlements for a user')
            .addUserOption(option => option.setName('user').setDescription('The user to validate entitlements for').setRequired(true));
    }

    async execute(interaction) {
        await interaction.deferReply();

        const hasPremium = this.checkEntitlements(interaction);
        if(hasPremium) {
            interaction.editReply('User has valid entitlement');
        } else {         
            interaction.editReply('User does not have valid entitlement');
        }
        
    }
}

module.exports = validateEntitlementCommand;