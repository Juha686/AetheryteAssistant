// Require the necessary discord.js classes
const redis = require('redis');
const { request } = require('undici');
const { scanRedis } = require('./libraries/db.js');

const Redis = redis.createClient({
	port: 6379,
	host: 'redis',
});
Redis.on('error', (err) => {
	console.log('Redis Client Error', err);
	process.exit(1);
});
Redis.on('ready', () => {
	console.log('Redis ready!');
});

async function handle(signal) {
	console.log(`Received ${signal}`);
	await Redis.disconnect();
	process.exit(0);
}

process.on('SIGTERM', handle);

async function fillDB() {
	const results = await request('https://raw.githubusercontent.com/ffxiv-teamcraft/ffxiv-teamcraft/master/libs/data/src/lib/json/items.json');

	const thingies = await results.body.json();
	for (const item in thingies) {
		// console.log(item + ': ' + thingies[item].en);
	}
}

fillDB();