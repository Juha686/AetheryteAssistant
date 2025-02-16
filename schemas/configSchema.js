const { Schema } = require('redis-om');

const configSchema = new Schema('config', {
    id: { type: 'string' },
    threads: { type: 'string' }  // Store as JSON string
}, {
    dataStructure: 'JSON'
});

module.exports = configSchema;