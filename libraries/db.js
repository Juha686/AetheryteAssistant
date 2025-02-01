async function scanRedis(redisClient, searchIndex) {

	const stream = redisClient.scanStream({ match: searchIndex, count: 100 });
	const matches = [];

	return new Promise((res) => {
		stream.on('data', async (resultKeys = []) => {
			let key;
			for (key of resultKeys) {
				if (!matches.includes(key)) {
					matches.push(key);
				}
			}
		});

		stream.on('end', () => {
			res(matches);
		});

	}).then((keysets) => {
		return keysets;
	}).catch((err) => {
		console.error(`Error while getting matches: ${err}`);
		return [];
	});


}

module.exports = {
	scanRedis,
};