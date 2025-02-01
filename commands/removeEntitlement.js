const baseCommand = require('./baseCommand.js');

class removeEntitlementCommand extends baseCommand {

    constructor(client = null) {
        super(client);
        this.admin = true;
        this.data
            .setName('remove_entitlement')
            .setDescription('Removes an entitlement from a user')
            .addUserOption(option => option.setName('user').setDescription('The user to remove the entitlement from').setRequired(true))
    }

    async execute(interaction) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const entitlements = interaction.entitlements;
        if(entitlements == null) {
            return false;
        }
        // Check entitlements Map's every entitlement to see if it's valid and has skuId of this.premium_sku
        const currentTimestamp = Date.now();
        const validEntitlements = entitlements.filter(e => e.skuId == this.premium_sku && e.endsTimestamp == null);
        const manager = this.client.application.entitlements;
        console.log(validEntitlements)
        manager.deleteTest(validEntitlements.first());
        interaction.editReply('Entitlement removed');
    }
}

module.exports = removeEntitlementCommand;