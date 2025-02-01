// Require the necessary discord.js classes
let shardId = process.env.POD_NAME.split('-')[2];
shardId = Number(shardId);
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events, Partials } = require('discord.js');
const token = process.env.BOT_TOKEN;
const { createClient } = require('redis');
const { execute: buildRepositories } = require('./libraries/buildrepositories.js');

const Redis = createClient({
	socket: {
		host: 'redis-cluster-service',
		port: '6379',
	},
});


Redis.on('error', (err) => {
	console.log('Redis Client Error', err);
	process.exit(1);
});
Redis.on('ready', () => {
	console.log('Redis ready!');
});

Redis.connect();

Redis.ping();
// Create a new client instance
console.log(`Shard ID: ${shardId}`);
const client = new Client({shards: shardId, shardCount: 5,  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages], partials: [Partials.Channel] });
client.shardId = shardId;
client.Redis = Redis;

client.commands = new Collection();

buildRepositories(client);

const eventsPath = path.join(__dirname, 'events');
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}
for (const file of commandFiles) {
	console.log('Deploying ' + file);
	const filePath = path.join(commandsPath, file);
	const commandClass = require(filePath);
	const eventModule = require(filePath);
	// Check that the commandClass is a class before creating an instance of it
	if (typeof commandClass !== 'function' || commandClass.name === 'BaseCommand') {
		console.log(`Skipping ${file} because it doesn't export a class.`);
		continue;
	}
	const command = new commandClass(client);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
	else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}



// Log in to Discord with your client's token
client.login(token);

async function handle(signal) {
	console.log(`Received ${signal}`);
	// Delete all listeners
	client.removeAllListeners();

	setTimeout(() => {
		Redis.disconnect();
		client.destroy();
		process.exit(0);
	}, 1000 * 2);
}

process.on('SIGTERM', handle);
