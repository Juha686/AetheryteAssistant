const { request } = require('undici');
const buildFunctionObject = require('./utils/buildFunctionObject');

// Function definitions
const wikiDefinitions = [
    buildFunctionObject('get_info_from_wiki', 'Get up to date information from the final fantasy 14 wiki.', {
        'type': 'object',
        'properties': {
            'page': {
                'type': 'string',
                'description': 'The wiki page to get the information of. Infer this from the users question.',
            },
        },
        'required': ['page'],
    }),
    buildFunctionObject('search_the_wiki', 'Find pages from the wiki. Title is the page string used in other functions.', {
        'type': 'object',
        'properties': {
            'what_to_search': {
                'type': 'string',
                'description': 'What to search from the wiki.',
            },
        },
        'required': ['what_to_search'],
    })
];

// Function implementations
async function get_info_from_wiki(interaction, args) {
    try {
        const encodedContent = encodeURIComponent(args.page);
        const results = await request(`https://ffxiv.consolegameswiki.com/mediawiki/api.php?action=parse&prop=wikitext&formatversion=2&format=json&page=${encodedContent}`);
        const { parse } = await results.body.json();

        if (!parse) {
            console.log(`Page not found: ${args.page}`);
            return `No wiki page found for "${args.page}". Please try a different search term.`;
        }

        if (parse.wikitext.length > 20000) {
            const shortUrl = `https://ffxiv.consolegameswiki.com/wiki/${encodedContent}`;
            return `Wiki page was too long and it was shortened.\nFull page available at: ${shortUrl}\n\n${parse.wikitext.substring(0, 20000)}`;
        }

        return parse.wikitext;
    } catch (error) {
        console.error('Error fetching wiki page:', error);
        return 'An error occurred while fetching the wiki page. Please try again later.';
    }
}

async function search_the_wiki(interaction, args) {
    console.log(args.what_to_search);
    const results = await request(`https://ffxiv.consolegameswiki.com/mediawiki/api.php?action=query&list=search&utf8=&format=json&srsearch=${args.what_to_search}`);
    const { query } = await results.body.json();

    if (typeof query !== 'undefined') {
        if (query.length > 20000) {
            console.log('Too long');
            return 'Wiki page too long';
        }
        if (query.searchinfo.totalhits == 0) {
            console.log(query);
            return 'No results found with search terms "' + args.what_to_search + '" .Try searching with different keywords or remove the word "set"';
        }
        return JSON.stringify(query);
    }
    else {
        console.log('Page not found');
        return 'Page not found';
    }
}

module.exports = {
    definitions: wikiDefinitions,
    get_info_from_wiki,
    search_the_wiki
};