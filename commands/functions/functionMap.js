const wikiFunctions = require('./wikiFunctions');
const marketboardFunctions = require('./marketboardFunctions');
const setFunctions = require('./setFunctions');
const imageFunctions = require('./imageFunctions');

// Collect all function modules
const functionModules = {
    wikiFunctions,
    marketboardFunctions,
    setFunctions,
    imageFunctions
};

// Initialize any modules that need setup
function initializeModules(dependencies) {
    for (const [_, module] of Object.entries(functionModules)) {
        if (typeof module.initialize === 'function') {
            module.initialize(dependencies);
        }
    }
}

// Combine all function definitions
const functionDefinitions = Object.values(functionModules).flatMap(module => module.definitions);

// Get function definitions filtered by premium status
function getFunctionDefinitions(hasPremium = false) {
    return functionDefinitions.filter(def => !def.isPremium || hasPremium);
}

// Automatically generate function map from definitions
const functionMap = functionDefinitions.reduce((map, definition) => {
    const moduleName = Object.entries(functionModules).find(([_, module]) => 
        module.definitions.some(def => def.name === definition.name)
    )[0];
    
    map[definition.name] = (interaction, args) => {
        // Just validate required parameters
        const { required = [] } = definition.parameters;
        for (const paramName of required) {
            if (!(paramName in args)) {
                throw new Error(`Missing required parameter: ${paramName} for function ${definition.name}`);
            }
        }

        // Pass args object directly instead of building an array
        return functionModules[moduleName][definition.name](interaction, args);
    };
    
    return map;
}, {});

module.exports = {
    functionMap,
    getFunctionDefinitions,
    initializeModules
};