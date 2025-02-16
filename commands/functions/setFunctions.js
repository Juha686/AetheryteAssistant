const buildFunctionObject = require('./utils/buildFunctionObject');

// Function definitions
const setDefinitions = [
    buildFunctionObject('sets', 'Get current price of sets from the sets command. Posts the answer as seperate message.', {
        'type': 'object',
        'properties': {
            'set': {
                'type': 'string',
                'description': 'What set to get price of. For best results, use get_set_information function to get the set name.',
            },
        },
        'required': ['set'],
    }),
    buildFunctionObject('get_set_information', 'Gets information about best tradeable items in final fantasy 14. Use this to get the set name for the sets function.', {
        'type': 'object',
        'properties': {
            'equipment_suffix': {
                'type': 'string',
                'description': 'The ending of the equipment used. For example "of Maiming" or "of Slaying". Infer this from the info acquired from the wiki.',
            },
        },
        'required': ['equipment_suffix'],
    })
];

// Function implementations
async function get_set_information(interaction, args) {
    console.log(args.equipment_suffix);
    const itemRepository = interaction.client.redisrepositories.get('itemRepository');

    const wordsToRemove = ['a', 'is', 'the', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for',
    'if', 'in', 'into', 'it', 'no', 'not', 'of', 'on', 'or', 'such', 'that', 'their',
    'then', 'there', 'these', 'they', 'this', 'to', 'was', 'will', 'with'];
    args.equipment_suffix.split(' ').filter(item => !wordsToRemove.includes(item)).join(' ');
    args.equipment_suffix = args.equipment_suffix.split(' ').map(s => s + '*').join(' ');
    const itemList = await itemRepository.search()
        .where('EN_Name')
        .match(args.equipment_suffix)
        .sortDescending('LEVELITEM')
        .return.all();

    let result = '';
    for (const val of itemList) {
        const resultSet = val['EN_Name'].split(' ');
        if (resultSet[2] == 'of' && typeof val.LEVELITEM != 'undefined' && result === '') {
            result = `This is the highest item level set found. Item level: ${val.LEVELITEM} | ${resultSet[0]} ${resultSet[resultSet.length - 1]} set`;
        }
    }
    console.log(result);
    if (!result) {
        result = 'Check the wiki for which armour set to search for';
    }
    return result;
}

async function sets(interaction, args) {
    const sets_command = interaction.client.commands.get('sets');
    const answer = await sets_command.execute(interaction, args.set);
    console.log(answer);
    return answer;
}

module.exports = {
    definitions: setDefinitions,
    get_set_information,
    sets
};