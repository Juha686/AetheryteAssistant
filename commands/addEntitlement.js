const baseCommand = require('./baseCommand');

class addEntitlementCommand extends baseCommand {

    constructor(client = null) {
        super(client);
        this.admin = true;
        this.data
            .setName('add_entitlement')
            .setDescription('Adds an entitlement to a user')
            .addUserOption(option => option.setName('user').setDescription('The user to add the entitlement to').setRequired(true))
    }

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const entitlement = interaction.options.getString('entitlement');
        const manager = this.client.application.entitlements;
        const entitlements = await manager.fetch();
        manager.createTest({sku: this.premium_sku, user: user.id});
        interaction.editReply('Entitlement added');
    }
}

module.exports = addEntitlementCommand;