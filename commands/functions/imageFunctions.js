const buildFunctionObject = require('./utils/buildFunctionObject');

let openaiInstance = null;

// Function definitions
const imageDefinitions = [
    buildFunctionObject(
        'generate_image', 
        'Generate an image. Use this function to describe situations or context.', 
        {
            'type': 'object',
            'properties': {
                'prompt': {
                    'type': 'string',
                    'description': 'Prompt for the image generating AI. Provide a detailed description.',
                },
            },
            'required': ['prompt'],
        },
        { isPremium: true }
    )
];

// Function implementations
async function generate_image(interaction, args) {
    if (!openaiInstance) {
        console.error('OpenAI instance not initialized');
        throw new Error('OpenAI instance not initialized');
    }
    
    try {
        const response = await openaiInstance.images.generate({
            model: "dall-e-3",
            prompt: args.prompt,
            n: 1,
            size: "1024x1024"
        });

        return response.data[0].url;
    } catch (error) {
        console.error('Error in generate_image:', error);
        throw error;
    }
}

function initialize(dependencies) {
    if (dependencies.openai) {
        openaiInstance = dependencies.openai;
    }
}

module.exports = {
    definitions: imageDefinitions,
    generate_image,
    initialize
};