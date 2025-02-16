const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	console.log('Deploying ' + file);
	const commandClass = require(path.join(commandsPath, file));
	// Check that the commandClass is a class before creating an instance of it
	if (typeof commandClass === 'function' && commandClass.name !== 'BaseCommand' && commandClass.name !== 'AICommand') {
		const command = new commandClass();
		// Check for admin
		if (command.admin) {
			continue;
		}
		commands.push(command.data.toJSON());
	}
	else {
		console.log(`Skipping ${file} because it doesn't export a class.`);
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		if (process.env.NODE_ENV != 'production') {
			console.log('Running in development, dont register');
			return;
		}
		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	}
	catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
