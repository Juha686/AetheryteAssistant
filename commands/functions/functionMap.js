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

function getFunctionDefinitions(raw = false) {
    // Return raw definitions if requested
    if(raw) {
        return functionDefinitions;
    }

    // Only include fields that OpenAI Assistant API accepts
    return functionDefinitions
        .map(def => ({
            type: 'function',
            function: {
                name: def.function.name,
                description: def.function.description,
                parameters: def.function.parameters
            }
        }));
}

// Automatically generate function map from definitions
const functionMap = functionDefinitions.reduce((map, definition) => {
    const moduleName = Object.entries(functionModules).find(([_, module]) => 
        module.definitions.some(def => 
            def.function && def.function.name === definition.function.name
        )
    )?.[0];

    if (moduleName && functionModules[moduleName][definition.function.name]) {
        map[definition.function.name] = functionModules[moduleName][definition.function.name];
    }
    
    return map;
}, {});


module.exports = {
    functionMap,
    getFunctionDefinitions,
    initializeModules
};