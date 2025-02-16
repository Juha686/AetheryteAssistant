const { Schema } = require('redis-om');

const metricsSchema = new Schema('Metrics', {
    ID: { type: 'string' },
    COUNT: { type: 'number' },
}, {
    dataStructure: 'HASH',
});

module.exports = metricsSchema;