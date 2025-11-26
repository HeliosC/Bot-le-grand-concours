const { Client, Message, MessageReaction, User, Guild, GuildMember, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder, AttachmentBuilder, Events, Collection, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const fs = require('node:fs');
const path = require('node:path');

const { isMod } = require("./utils");
const { commandPrefix, rolesID, guildId, testChannel, categoryID } = require("./constants/constants");
const { log, error } = require("node:console");

const answersEmojis = ["🇦", "🇧", "🇨", "🇩"];
const answerEmojiMap = { "🇦": "A", "🇧": "B", "🇨": "C", "🇩": "D" };
const nextQuestionEmoji = '⏩'

var playersInfo = new Map();

const TIME_TOTAL = 10
const TIME_END = -2
var timeRemaining = TIME_END

var client
var questionData
var adminPannel

//var stompServer //TO REMOVE


function generateCommands() {
	//generate commands object
	client.commands = new Collection();
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
}

function executeListeners() {
	//execute event listeners
	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}
}

function getPlayersData(res) {
	const playerInfoToRes = Array.from(playersInfo.values()).map((playerInfo) => {
		return {
			nickname: playerInfo.player.nickname ?? playerInfo.player.user.globalName ?? playerInfo.player.user.username,
			avatarURL: playerInfo.player.user.avatarURL()	
		}
	})
	res.json(playerInfoToRes)
}

function startBot() {
	//stompServer = mStompServer

	const botClient = new Client({
		intents : [
			GatewayIntentBits.Guilds, 
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessageReactions,
			GatewayIntentBits.MessageContent
		]
	});

	botClient.on('ready', () => { 
		console.log(`Discord client logged in !`) 
		resetDiscord()
	});
	botClient.on('error', (e) => console.error(e));
	botClient.on('warn', (e) => console.warn(e));
    botClient.on('debug', (e) => console.info(e));

    botClient.on('messageCreate', (message) => onMessage(message));
	botClient.on('messageReactionAdd', (reaction, user) => onReactionAdd(reaction, user));

    botClient.login(process.env.BOT_TOKEN);

	client = botClient

	generateCommands()
	executeListeners()
}

/** 
 * @param {Message} message 
 * */
function onMessage(message) {
	switch(message.channel.type) {
		case ChannelType.GuildText: 
			onTextMessage(message);
			break;
	}
}

/** 
 * @param {MessageReaction} reaction 
 * @param {User} user 
 * */
function onReactionAdd(reaction, user) {
	if (user.bot) return

	// let member = reaction.message.guild.member(user)
	let member = reaction.message.guild.members.fetch({ user, force: false })
	if (isMod(member, reaction.message.guild) && reaction.message.id == adminPannel?.id) {
		onAdminPannelReact(reaction, user)
	} else if (playersInfo.has(user.id) && playersInfo.get(user.id).message.id == reaction.message.id) {
		onPlayerReact(reaction, user)
	} else if (reaction.message.id != adminPannel?.id){
		return
	}
}	

/** 
 * @param {MessageReaction} reaction 
 * @param {User} admin 
 * */
function onAdminPannelReact(reaction, admin) {
	if (!adminPannel) return

	const reactionEmoji = reaction.emoji.toString()
	if (reactionEmoji == nextQuestionEmoji) {
		launchNextQuestion({ n: 1, question: "Comment s'appelle le cheval blanc d'Henri VI ?", a:"La réponse A", b:"Une autre réponse", c:"Prout !", d:"Tu sais :)", url: "https://cdn.futura-sciences.com/buildsv6/images/largeoriginal/d/5/3/d53a89351b_50036006_mandelbrot-ensemble-wikipedia-commons.jpg" })
		Array.from(adminPannel.reactions.cache.values()).forEach(r => r.users.remove(admin.id))
	} else if (answersEmojis.includes(reactionEmoji)) {
		revealAnswer(reactionEmoji)
	} else {
		reaction.users.remove(admin.id)
	}
}

function launchNextQuestion(mQuestionData, res) {
	questionData = mQuestionData
	updateQuestionMessage(res)
}

function updateQuestionMessage(res) {
	const coercedTimeRemaining = Math.max(timeRemaining, 0)
	let timeMessage = `Temps restant : ${coercedTimeRemaining} seconde${coercedTimeRemaining > 1 ? "s" : ""}`
	if (timeRemaining == TIME_END) {
		timeMessage = 'Temps écoulé'
	}

	adminPannel?.edit(
		{ embeds: [ new EmbedBuilder().setDescription( 
			`ADMIN PANNEL - DEV ONLY
			Question n° n
			${timeMessage}

			⏩ Prochaine question
			🇦 🇧 🇨 🇩 Selectionner la bonne réponse`
		)]}
	)
	
	Promise.all(
		Array.from(playersInfo.values()).map(playerInfo => {
			playerInfo.answer = undefined

			return playerInfo.message.edit(buildGameMessage(true, playerInfo.player.id, playerInfo))
				.then(message => {
					return message.awaitMessageComponent({
						filter: i => i.user.id === playerInfo.player.id,
						time: (TIME_TOTAL - TIME_END) * 1000
					}).then(interaction => {

						//playersInfo.get(playerInfo.player.id).answer = reaction.emoji.toString()
						playerInfo.answer = interaction.customId
						
						interaction.update(buildGameMessage(true, playerInfo.player.id, playerInfo))

						return interaction.customId
					})
					.catch(error => {
						playerInfo.answer = null

						const reply = buildGameMessage(true, playerInfo.player.id, playerInfo)
						message.edit(reply)
						return null
					})
				})
		})
	).then((values) => {
		console.log(values);

		res.json({ answers: values })
	})
}

async function getPlayerAnswer(message) {
	const played = await message.awaitMessageComponent({
		filter: i => i.user.id === game.users[game.connect4Game.currentPlayer - 1].id,
		time: (TIME_TOTAL - TIME_END) * 1000
	})
}

function buildGameMessage(isInGame, playerId, playerInfo) {
	const coercedTimeRemaining = Math.max(timeRemaining, 0)

	const logo = new AttachmentBuilder("src/discord/attachments/logo.png", "logo.png")
	const embed = new EmbedBuilder()
		// .attachFiles(logo)
		.setAuthor({ name: 'Le Grand Concours', iconURL: 'attachment://logo.png'})
		.setThumbnail('attachment://logo.png')
		.setFooter({ text: "Made by Thomennn and Helios"})
	
	if (isInGame) {
		let answer = playerInfo.answer ?? ''
		let answerMessage = `Votre réponse : ${answer}`
		if (timeRemaining == TIME_END && !playerInfo.answer) {
			answerMessage = 'Vous n\'avez pas répondu'
		}
		
		embed
			.setColor(playerInfo.answer === undefined ? '#11bf20' : '#d61111')
			.setTitle(`Question n° ${questionData.n}`)
			.setDescription(questionData.question)
			.setImage(questionData.url)

		return { embeds: [embed], components: getAnswerButtons(questionData, playerInfo.answer) }
	} else {
		embed
			.setColor('#d61111')
			.setDescription(`Bienvenue <@${playerId}> !`)

		return { embeds: [embed], files: [logo] }
	}
}

function getAnswerButtons(questionData, answer) {	
	const AButton = new ButtonBuilder()
		.setCustomId('A')
		.setLabel("A) " + questionData.a)
		.setStyle((answer !== undefined && answer != 'A') ? ButtonStyle.Secondary : ButtonStyle.Primary);

	const BButton = new ButtonBuilder()
		.setCustomId('B')
		.setLabel("B) " + questionData.b)
		.setStyle((answer !== undefined && answer != 'B') ? ButtonStyle.Secondary : ButtonStyle.Primary);

	const CButton = new ButtonBuilder()
		.setCustomId('C')
		.setLabel("C) " + questionData.c)
		.setStyle((answer !== undefined && answer != 'C') ? ButtonStyle.Secondary : ButtonStyle.Primary);

	const DButton = new ButtonBuilder()
		.setCustomId('D')
		.setLabel("D) " + (questionData.d))
		.setStyle((answer !== undefined && answer != 'D') ? ButtonStyle.Secondary : ButtonStyle.Primary);

	const row1 = new ActionRowBuilder().addComponents(AButton, BButton)
	const row2 = new ActionRowBuilder().addComponents(CButton, DButton)

	return [row1, row2]
}

/** @param {String} answer */
function retrieveAnswers(res) {
	let answers = []
	playersInfo.forEach((playerInfo, playerID) => {
		answers.push(answerEmojiMap[playerInfo.answer])
		Array.from(playerInfo.message.reactions.cache.values()).forEach(r => r.users.remove(playerID))
	})

	res.json({ answers: answers })


	//TO REMOVE
	//stompServer.send('/displayAnswers', {}, JSON.stringify({ answers: answers }));
}

function countdown(res) {
    countdownTimeoutId = setTimeout(() => {
        if (timeRemaining > TIME_END) {
            timeRemaining -= 1;
            updateQuestionMessage();
            countdown(res);
        } else {
			retrieveAnswers(res)
            countdownTimeoutId = null;
        }
    }, 1000);
};

/** 
 * @param {MessageReaction} reaction 
 * @param {User} user 
 * */
function onPlayerReact(reaction, user) {
	if (!answersEmojis.includes(reaction.emoji.toString()) || timeRemaining == TIME_END || playersInfo.get(user.id).answer != null) {
		reaction.users.remove(user.id)
		return
	}

	let playerInfo = playersInfo.get(user.id)
	playerInfo.answer = reaction.emoji.toString()
	playersInfo.set(user.id, playerInfo)
}

/**
 *  @param {Message} message 
 * */
function onTextMessage(message) {

	if (!isMod(message.member, message.guild)) return
}

/** 
 * @param {Guild} guild 
 * @param {GuildMember[]} players 
 * */
function startConcours(interaction, guild, players) {
	resetDiscord()
	//category = guild.channels.cache.get(categoryID)
		/*.create({
			name: 'LE GRAND CONCOURS',
			type: ChannelType.GuildCategory,
			permissionOverwrites: [
				{
					id: guild.roles.cache.find(r => r.name === '@everyone').id,
					deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
				},
				{
					id: guild.roles.cache.find(r => r.id === rolesID.bot).id,
					allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
				}
			],
			position: 1
		})*/


		

		//.then((category) => {
			//categoryID = category.id

			var deskId = 0
			players.forEach((player) => {
				playersInfo.set(player.id, {
					deskId,
				})
				deskId++

				guild.channels
					.create({
						name: (playersInfo.get(player.id).deskId + 1) + "-" + (player.nickname || player.user.username),
						parent: categoryID,
						permissionOverwrites: [
							{
								id: guild.roles.cache.find(r => r.name === '@everyone').id,
								deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
							},
							{
								id: guild.roles.cache.find(r => r.id === rolesID.bot).id,
								allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
							},
							{
								id: player.id,
								allow: [PermissionsBitField.Flags.ViewChannel]
							}
						]
					})
					.then((channel) => {
						channel
							.send(buildGameMessage(false, player.id))
							.then(message => {
								playersInfo.set(player.id, {
									player: player,
									message: message,
									channel: channel,
									answer: null
								})
							})
							.catch(console.error);
					})
					.catch(console.error);
			})
		//})
		//.catch(console.error);


	interaction.reply({
		content: "Concours lancé !",
		flags: MessageFlags.Ephemeral	
	})
}

function initDiscord(interaction) {
	console.log("initDiscord");

	let guild = client.guilds.cache.get(guildId)

    //TODO: BY ROLE?
	guild.members.fetch()
		.then(members => {
			let players = members.filter(m => m.roles.cache.some(r => r.id === rolesID.player))
			startConcours(interaction, guild, players)
		})
		.catch(g => { console.error("failed to load members" + g) })
}

function resetDiscord(interaction) {
	try {
		adminPannel?.delete()
	} catch (error) {}

	playersInfo = new Map();
	deleteChannels()

	interaction?.reply({
		content: "Suppression lancée",
		flags: MessageFlags.Ephemeral
	})
}

function deleteChannels() {
	let guild = client.guilds.cache.get(guildId)

	Array.from(guild.channels.cache.values()).forEach(ch => { //By Parent
		//if (ch.name == 'LE GRAND CONCOURS' || (ch.parent != null && ch.parent.name == 'LE GRAND CONCOURS')) {
		if (ch.parent != null && ch.parent.id === categoryID) {
				ch.delete()
		}
	})
}

module.exports.start = startBot;
module.exports.launchNextQuestion = launchNextQuestion;
module.exports.getPlayersData = getPlayersData;

module.exports.initDiscordAndStartConcours = initDiscord;
module.exports.resetDiscord = resetDiscord;