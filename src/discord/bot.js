const { Client, MessageAttachment } = require("discord.js");

function startBot() {

	const client = new Client();

	client.on('ready', () => { console.log(`Logged in as ${client.user.tag}!`) });
	client.on("error", (e) => console.error(e));
	client.on("warn", (e) => console.warn(e));
    client.on("debug", (e) => console.info(e));

    client.on('message', () => {});
	client.on('messageReactionAdd', () => {});
    client.on('messageReactionRemove', () => {});
    
    client.login(process.env.BOT_TOKEN);
}

module.exports.start = startBot;