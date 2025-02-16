const { Schema } = require('redis-om');

const itemSchema = new Schema('Item', {
    ID: { type: 'string' },
    EN_Name: { type: 'text' },
    DE_Name: { type: 'text' },
    JA_Name: { type: 'text' },
    FR_Name: { type: 'text' },
    ITEMSLOT: { type: 'number', sortable: true },
    LEVELEQUIP: { type: 'number', sortable: true },
    LEVELITEM: { type: 'number', sortable: true },
}, {
    dataStructure: 'HASH',
});

module.exports = itemSchema;