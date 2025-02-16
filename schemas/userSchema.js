const { Schema } = require('redis-om');

const userSchema = new Schema('User', {
    ID: { type: 'string' },
    DATACENTER: { type: 'string' },
    SERVER: { type: 'string' },
    LANGUAGE: { type: 'string' },
    SEEN_AD: { type: 'boolean' },
    threads: { type: 'string' }
}, {
    dataStructure: 'HASH',
});

module.exports = userSchema;