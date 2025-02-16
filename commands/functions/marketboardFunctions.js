const buildFunctionObject = require('./utils/buildFunctionObject');

// Function definitions
const marketboardDefinitions = [
    buildFunctionObject('marketboard', 'Get current price of items from the marketboard. Posts the answer as seperate message.', {
        'type': 'object',
        'properties': {
            'item': {
                'type': 'string',
                'description': 'What item to get price of',
            },
        },
        'required': ['item'],
    })
];

// Function implementations
async function marketboard(interaction, args) {
    const marketboard_command = interaction.client.commands.get('marketboard');
    const answer = await marketboard_command.execute(interaction, args.item);
    console.log(answer);
    return answer;
}

module.exports = {
    definitions: marketboardDefinitions,
    marketboard
};