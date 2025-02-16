/* eslint-disable comma-dangle */
const { SlashCommandBuilder } = require('discord.js');
const { request } = require('undici');
const baseCommand = require('./baseCommand');

class updateItemsCommand extends baseCommand {

	constructor(client = null) {
		super(client);
		this.admin = true;
		this.data
			.setName('update_items')
			.setDescription('Gets latest item data');
	}

	async execute(interaction) {
		await interaction.deferReply();
		if (interaction.user.id != '169206245478236161') return interaction.editReply('Only for administrators!');
		const results = await request('https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/json/items.json');
		const itemData = await results.body.json();

		const marketableResults = await request('https://universalis.app/api/v2/marketable');
		const marketableThingies = await marketableResults.body.json();
		let tempItem = {};
		const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
		let i = 0;
		let u = 0;
		for (const item in itemData) {
			if (marketableThingies.includes(Number(item))) {
				const dbItem = await this.itemRepository.fetch(item);

				if (typeof dbItem.ITEMSLOT !== 'undefined') {
					tempItem = {
						ID: item,
						EN_Name: itemData[item].en,
						DE_Name: itemData[item].de,
						JA_Name: itemData[item].ja,
						FR_Name: itemData[item].fr,
						ITEMSLOT: dbItem.ITEMSLOT,
						LEVELEQUIP: dbItem.LEVELEQUIP,
						LEVELITEM: dbItem.LEVELITEM,
					};
				}
				else {
					const itemAdditionalResults = await request(`https://v2.xivapi.com/api/sheet/Item/45579?fields=EquipSlotCategory,LevelItem,LevelEquip`);
					const itemAdditionalData = await itemAdditionalResults.body.json();
					tempItem = {
						ID: item,
						EN_Name: itemData[item].en,
						DE_Name: itemData[item].de,
						JA_Name: itemData[item].ja,
						FR_Name: itemData[item].fr,
						ITEMSLOT: itemAdditionalData.fields.EquipSlotCategory.value,
						LEVELEQUIP: itemAdditionalData.fields.LevelEquip,
						LEVELITEM: itemAdditionalData.fields.LevelItem.value,
					};
					await delay(40);
					u++;
					console.log(`Got new item ${u} / ${marketableThingies.length}, the new info is ${JSON.stringify(tempItem)}`);
				}
				tempItem = await this.itemRepository.save(item, tempItem);
				if (i % 40 == 0) {
					console.log(`Done with ${i} / ${u} / ${marketableThingies.length}`);
				}
				i++;
			}
		}
		await this.itemRepository.createIndex();
		await interaction.editReply(`All done :) found ${u} new out of ${i} items checked`);
	}
}



module.exports = updateItemsCommand;