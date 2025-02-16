
// Code interpreter definition
const codeInterpreterDefinition = { type: 'code_interpreter' };

// Function to get code interpreter tools
function getCodeInterpreterTools() {
    return [codeInterpreterDefinition];
}

module.exports = {
    getCodeInterpreterTools
};