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
    console.log('Generate image called with args:', args);
    if (!openaiInstance) {
        console.error('OpenAI instance not initialized');
        throw new Error('OpenAI instance not initialized');
    }
    
    try {
        const response = await openaiInstance.createImage({
            model: 'dall-e-3',
            prompt: 'I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: ' + args.prompt + ' Image should be stylised like the game Final Fantasy 14.',
            n: 1,
            size: "1024x1024",
            response_format: "url"
        });
        console.log('Image generation response:', response.data);
        
        // Send the image URL to Discord as an embed
        await interaction.editReply({ 
            embeds: [{
                image: {
                    url: response.data.data[0].url
                }
            }]
        });
        
        return response.data.data[0].url;
    } catch (error) {
        console.error('Error in generate_image:', error);
        if (error.response?.data?.error) {
            console.error('OpenAI error details:', error.response.data.error);
            throw new Error(`Image generation failed: ${error.response.data.error.message}`);
        }
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