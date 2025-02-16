function buildFunctionObject(name, description, parameters, options = {}) {
    return {
        type: 'function',
        function: {
            name,
            description,
            parameters
        },
        options: {
            isPremium: options.isPremium || false
        }
    };
}

module.exports = buildFunctionObject;