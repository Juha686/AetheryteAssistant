function buildFunctionObject(name, description, parameters, options = {}) {
    return {
        name,
        description,
        parameters,
        isPremium: options.isPremium || false
    };
}

module.exports = buildFunctionObject;