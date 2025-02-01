const { Schema, Repository } = require('redis-om');
const { Collection } = require('discord.js');

module.exports = {
	async execute(client) {



		const itemSchema = new Schema('Item', {
			ID: { type: 'string' },
			EN_Name: { type: 'text' },
			DE_Name: { type: 'text' },
			JA_Name: { type: 'text' },
			FR_Name: { type: 'text' },
			ITEMSLOT: { type: 'number', sortable: true },
			LEVELEQUIP: { type: 'number', sortable: true },
			LEVELITEM:{ type:'number', sortable: true },
		}, {
			dataStructure: 'HASH',
		});

		client.redisrepositories = new Collection();
		const itemRepository = new Repository(itemSchema, client.Redis);
		itemRepository.createIndex();
		client.redisrepositories.set('itemRepository', itemRepository);

		const userSchema = new Schema('User', {
			ID: { type: 'string' },
			DATACENTER: { type:'string' },
			SERVER: { type:'string' },
			LANGUAGE: { type:'string' },
			SEEN_AD: { type:'boolean' },
		}, {
			dataStructure: 'HASH',
		});

		const userRepository = new Repository(userSchema, client.Redis);
		userRepository.createIndex();
		client.redisrepositories.set('userRepository', userRepository);

		const metricsSchema = new Schema('Metrics', {
			ID: { type: 'string' },
			COUNT: { type: 'number' },
		}, {
			dataStructure: 'HASH',
		});

		const metricsRepository = new Repository(metricsSchema, client.Redis);
		metricsRepository.createIndex();
		client.redisrepositories.set('metricsRepository', metricsRepository);

		const assistantMessageLogSchema = new Schema('assistantMessageLog', {
			chatUUID: { type: 'string' },
			MESSAGES: { type:'string[]' },
		});

		const assistantMessageLogRepository = new Repository(assistantMessageLogSchema, client.Redis);
		assistantMessageLogRepository.createIndex();
		client.redisrepositories.set('assistantMessageLogRepository', assistantMessageLogRepository);

		const creativeAssistantMessageLogSchema = new Schema('creativeAssistantMessageLog', {
			chatUUID: { type:'string' },
			MESSAGES: { type:'string[]' },
		});

		const creativeAssistantMessageLogRepository = new Repository(creativeAssistantMessageLogSchema, client.Redis);
		creativeAssistantMessageLogRepository.createIndex();
		client.redisrepositories.set('creativeAssistantMessageLogRepository', creativeAssistantMessageLogRepository);

		const chatMessageLogRepositorySchema = new Schema('chatMessageLog', {
			chatUUID: { type:'string' },
			MESSAGES: { type:'string[]' },
		});

		const chatMessageLogRepository = new Repository(chatMessageLogRepositorySchema, client.Redis);
		chatMessageLogRepository.createIndex();
		client.redisrepositories.set('chatMessageLogRepository', chatMessageLogRepository);
	},
};