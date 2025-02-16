const { Schema } = require('redis-om');

const chatMessageLogSchema = new Schema('chatMessageLog', {
    chatUUID: { type: 'string' },
    MESSAGES: { type: 'string[]' },
});

module.exports = chatMessageLogSchema;