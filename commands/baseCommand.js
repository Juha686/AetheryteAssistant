const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { mapUserLanguage } = require('../libraries/language.js');

class BaseCommand {
    constructor(client = null) {
        this.client = client;
        if (client) {
            this.itemRepository = client.redisrepositories.get('itemRepository');
            this.userRepository = client.redisrepositories.get('userRepository');
            this.assistantMessageLogRepository = client.redisrepositories.get('assistantMessageLogRepository');
            this.chatMessageLogRepository = client.redisrepositories.get('chatMessageLogRepository');
            this.creativeAssistantMessageLogRepository = client.redisrepositories.get('creativeAssistantMessageLogRepository');
            this.metricsRepository = client.redisrepositories.get('metricsRepository');
            this.configRepository = client.redisrepositories.get('configRepository');
        }
        this.premium_sku = '1286386380380962856';
        this.data = new SlashCommandBuilder();
    }

    async execute(interaction) {
        await interaction.deferReply();
        await interaction.editReply('This command is not yet implemented.');
    }

    async getLanguageString(user) {
        return mapUserLanguage(user.LANGUAGE);
    }

    async getLanguageStringFromLanguage(language) {
        return mapUserLanguage(language);
    }

    // Function to remove common words
    removeCommonWords(query) {
        const wordsToRemove = ['a', 'is', 'the', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
            'if', 'in', 'into', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'their',
            'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
        return query.split(' ').filter(item => !wordsToRemove.includes(item)).join(' ');
    }

    checkEntitlements(interaction) {
        const user = interaction.user;
        const entitlements = interaction.entitlements;
        
        if(entitlements == null) {
            return false;
        }
        
        const currentTimestamp = Date.now();
        const validEntitlements = entitlements.filter(e => 
            e.skuId == this.premium_sku && 
            (e.endsTimestamp > currentTimestamp || e.endsTimestamp == null)
        );
        
        // Check if user has valid entitlements or is the specified user ID
        return validEntitlements.size > 0;
    }

    async postAdvert(interaction) {
        let isPremium = this.checkEntitlements(interaction);

        const user = await this.userRepository.fetch(interaction.user.id);
        // If user is premium, no advert is necessary. Else post a one time advert telling them about premium
        if(interaction.user.id == '169206245478236161') {
            isPremium = true;
        }
        console.log(user);
        if(!isPremium && (!user.SEEN_AD || user.SEEN_AD == null)) {
            const embed = new EmbedBuilder()
                .setTitle('🌟 Upgrade to Premium - Support development 🌟')
                .setURL(`https://discord.com/application-directory/1083727340246401045/store/1286386380380962856`)
                .setDescription(`Thanks for letting the Aetheryte Assistant tag along as you explore the world of Eorzea! By upgrading to Premium, you'll help support development of Aetheryte Assistant and unlock some cool perks:`)
                .addFields(
                    { name: `A Smarter Assistant`, value: `With more training and up-to-date knowledge, the assistant can give you much more detailed and accurate responses.` }, 
                    { name: `Image Generation`, value: `In addition to the storytelling capabilities of the '/creative' command, you can also generate vivid images that help bring your adventures and stories to life.` }, 
                    { name: `Faster Response Times`, value: `With higher processing speeds, AI-powered responses can be generated slightly faster.` }, 
                    { name: `More To Come`, value: `By supporting ongoing development, you're making future updates and exciting new features possible!` })
                .setColor('#FFD700')
                .setFooter({ text: 'Thank you again for your continued support!' });
            interaction.followUp({ embeds: [embed], ephemeral: true });
            user.SEEN_AD = true;
            this.userRepository.save(user);
        }
    }
}

module.exports = BaseCommand;