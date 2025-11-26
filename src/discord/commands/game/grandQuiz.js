const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { initDiscordAndStartConcours, resetDiscord } = require('../../bot');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('grandquiz')
		.setDescription('Commandes de gestion du Grand Quiz')
		.addSubcommand(subcommand =>
			subcommand
				.setName('start')
				.setDescription('Lance le quiz'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('reset')
				.setDescription('Supprime les channels')),
		
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand()
		switch (subcommand) {
			case "start": {
				console.log("command start");
				
				initDiscordAndStartConcours(interaction)
				break
			}

			case "reset": {
				resetDiscord(interaction)
				break
			}
		}
	},
};