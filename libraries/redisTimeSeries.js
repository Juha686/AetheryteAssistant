const { TimeSeriesDuplicatePolicies, TimeSeriesEncoding } = require('@redis/time-series');


async function logToTS(timeseries, key, client) {
	await client.ts.add(timeseries, '*', key);
}

async function logCommandToTS(command, client) {
	const ts_policies = {
		RETENTION: 0,
		ENCODING: TimeSeriesEncoding.COMPRESSED,
		DUPLICATE_POLICY: TimeSeriesDuplicatePolicies.BLOCK,
	};
	client.ts.add('commands', '*', 1, ts_policies);
	client.ts.add(command, '*', 1, ts_policies);
	console.log(`${command} was logged`);
}

module.exports = { logToTS, logCommandToTS };