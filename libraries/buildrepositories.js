const { Repository } = require('redis-om');
const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    async execute(client) {
        client.redisrepositories = new Collection();
        
        // Get all schema files from the schemas directory
        const schemasPath = path.join(__dirname, '..', 'schemas');
        const schemaFiles = fs.readdirSync(schemasPath).filter(file => file.endsWith('.js'));

        // Load each schema and create its repository
        for (const file of schemaFiles) {
            const schema = require(path.join(schemasPath, file));
            // Use consistent naming of repositories
            const repositoryName = file.replace('Schema.js', 'Repository').replace('.js', 'Repository');
            
            console.log(`Creating repository: ${repositoryName}`);
            const repository = new Repository(schema, client.Redis);
            await repository.createIndex();
            
            client.redisrepositories.set(repositoryName, repository);
            console.log(`Repository ${repositoryName} created successfully`);
        }
    },
};