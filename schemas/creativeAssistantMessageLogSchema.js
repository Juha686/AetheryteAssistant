const { Schema } = require('redis-om');

const creativeAssistantMessageLogSchema = new Schema('creativeAssistantMessageLog', {
    chatUUID: { type: 'string' },
    MESSAGES: { type: 'string[]' },
});

module.exports = creativeAssistantMessageLogSchema;