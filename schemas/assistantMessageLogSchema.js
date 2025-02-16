const { Schema } = require('redis-om');

const assistantMessageLogSchema = new Schema('assistantMessageLog', {
    chatUUID: { type: 'string' },
    MESSAGES: { type: 'string[]' },
});

module.exports = assistantMessageLogSchema;