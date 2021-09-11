const { Client, Message, MessageReaction, User, Guild, GuildMember, MessageEmbed, MessageAttachment } = require("discord.js");
const { isMod } = require("./utils");
const { commandPrefix, rolesID, guildId, testChannel } = require("./constants");

const answersEmojis = ["🇦", "🇧", "🇨", "🇩"];
const answerEmojiMap = { "🇦": "A", "🇧": "B", "🇨": "C", "🇩": "D" };
const nextQuestionEmoji = '⏩'

var playersInfo = new Map();

const TIME_TOTAL = 10
const TIME_END = -3
var timeRemaining = TIME_END

var client
var questionData
var adminPannel
var stompServer

function startBot(mStompServer) {
	stompServer = mStompServer

	const botClient = new Client();

	botClient.on('ready', () => { 
		console.log(`Logged in !`) 
		resetDiscord()
	});
	botClient.on('error', (e) => console.error(e));
	botClient.on('warn', (e) => console.warn(e));
    botClient.on('debug', (e) => console.info(e));

    botClient.on('message', (message) => onMessage(message));
	botClient.on('messageReactionAdd', (reaction, user) => onReactionAdd(reaction, user));
    
    botClient.login(process.env.BOT_TOKEN);

	client = botClient
}

/** 
 * @param {Message} message 
 * */
function onMessage(message) {
	switch(message.channel.type) {
		case 'text': 
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

	let member = reaction.message.guild.member(user)
	if (isMod(member, reaction.message.guild) && reaction.message.id == adminPannel.id) {
		onAdminPannelReact(reaction, user)
	} else if (playersInfo.has(user.id) && playersInfo.get(user.id).message.id == reaction.message.id) {
		onPlayerReact(reaction, user)
	} else if (reaction.message.id != adminPannel.id){
		return
	}
}	

/** 
 * @param {MessageReaction} reaction 
 * @param {User} admin 
 * */
function onAdminPannelReact(reaction, admin) {
	const reactionEmoji = reaction.emoji.toString()
	if (reactionEmoji == nextQuestionEmoji) {
		launchNextQuestion({ n: 1, question: "Comment s'appelle le cheval blanc d'Henri VI ?", a:"La réponse A", b:"Une autre réponse", c:"Prout !", d:"Tu sais :)", url: "https://cdn.futura-sciences.com/buildsv6/images/largeoriginal/d/5/3/d53a89351b_50036006_mandelbrot-ensemble-wikipedia-commons.jpg" })
		adminPannel.reactions.cache.array().forEach(r => r.users.remove(admin.id))
	} else if (answersEmojis.includes(reactionEmoji)) {
		revealAnswer(reactionEmoji)
	} else {
		reaction.users.remove(admin.id)
	}
}

function launchNextQuestion(mQuestionData) {
	questionData = mQuestionData
	if (timeRemaining != TIME_END) return
	timeRemaining = TIME_TOTAL
	playersInfo.forEach((playerInfo, playerID) => {
		playerInfo.answer = null
		playersInfo.set(playerID, playerInfo)
	})
	updateQuestionMessage()
	countdown()
}

function updateQuestionMessage(correctAnswer) {
	const coercedTimeRemaining = Math.max(timeRemaining, 0)
	let timeMessage = `Temps restant : ${coercedTimeRemaining} seconde${coercedTimeRemaining > 1 ? "s" : ""}`
	if (timeRemaining == TIME_END) {
		timeMessage = 'Temps écoulé'
	}

	adminPannel.edit(
		{ embed: { description: 
			`ADMIN PANNEL - DEV ONLY
			Question n° n
			${timeMessage}

			⏩ Prochaine question
			🇦 🇧 🇨 🇩 Selectionner la bonne réponse`
		} }
	)

	playersInfo.forEach((playerInfo, _) => {
		playerInfo.message.edit({
			embed: buildEmbed(true, undefined, playerInfo)
		})
	})
}

function buildEmbed(isInGame, playerTag, playerInfo) {
	const coercedTimeRemaining = Math.max(timeRemaining, 0)

	const logo = new MessageAttachment("src/discord/attachments/logo.png", "logo.png")
	const embed = new MessageEmbed()
		.attachFiles(logo)
		.setAuthor('Le Grand Concours', 'attachment://logo.png')
		.setThumbnail('attachment://logo.png')
		.setFooter("Made by Thomennn and Helios")
	
	if (isInGame) {
		let answer = playerInfo.answer ?? ''
		let answerMessage = `Votre réponse : ${answer}`
		if (timeRemaining == TIME_END && !playerInfo.answer) {
			answerMessage = 'Vous n\'avez pas répondu'
		}
		
		embed
			.setColor(timeRemaining > TIME_END ? '#11bf20' : '#d61111')
			.setTitle(`Question n° ${questionData.n}   ${':green_square:'.repeat(coercedTimeRemaining) + ':white_large_square:'.repeat(TIME_TOTAL - coercedTimeRemaining)}`)
			.setDescription(questionData.question)
			.addFields(
				{ name: "\u200B", value: "\u200B"},
				{ name: "🇦", value: questionData.a, inline: true },
				{ name: "🇧", value: questionData.b, inline: true },
				{ name: "\u200B", value: "\u200B"},
				{ name: "🇨", value: questionData.c, inline: true },
				{ name: "🇩", value: questionData.d, inline: true },
				{ name: "\u200B", value: "\u200B"},
				{ name: "Utilisez 🇦 🇧 🇨 🇩 pour répondre ⏬", value: `${answerMessage}`},
			)
			.setImage(questionData.url)
	} else {
		embed
			.setColor('#d61111')
			.setDescription(`Bienvenue ${playerTag} !`)
	}

	return embed
}

/** @param {String} answer */
function retrieveAnswers() {
	let answers = []
	playersInfo.forEach((playerInfo, playerID) => {
		answers.push(answerEmojiMap[playerInfo.answer])
		playerInfo.message.reactions.cache.array().forEach(r => r.users.remove(playerID))
	})
	stompServer.send('/displayAnswers', {}, JSON.stringify({ answers: answers }));
}

function countdown() {
    countdownTimeoutId = setTimeout(() => {
        if (timeRemaining > TIME_END) {
            timeRemaining -= 1;
            updateQuestionMessage();
            countdown();
        } else {
			retrieveAnswers()
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

	if (!message.content.startsWith(commandPrefix) || message.author.bot) return
	const command = message.content.slice(commandPrefix.length).split(/\s+/)[0]

	switch (command) {
		case 'start':
			initDiscord()
			break;
		case 'reset':
			resetDiscord();
			break;
	}
}

/** 
 * @param {Guild} guild 
 * @param {GuildMember[]} players 
 * */
function startConcours(guild, players) {
	resetDiscord()

	guild.channels
		.create('LE GRAND CONCOURS', {
			type: 'category',
			permissionOverwrites: [
				{
					id: guild.roles.cache.find(r => r.name === '@everyone').id,
					deny: ['VIEW_CHANNEL', 'SEND_MESSAGES']
				}
			],
			position: 1
		})
		.then((category) => {
			categoryID = category.id

			players.forEach((player) => {
				guild.channels
					.create(player.nickname || player.user.username, {
						parent: category.id,
						permissionOverwrites: [
							{
								id: guild.roles.cache.find(r => r.name === '@everyone').id,
								deny: ['VIEW_CHANNEL', 'SEND_MESSAGES']
							},
							{
								id: player.id,
								allow: ['VIEW_CHANNEL']
							}
						]
					})
					.then((channel) => {
						channel
							.send({ embed: buildEmbed(false, player.user.tag) })
							.then(message => {
								playersInfo.set(player.id, {
									player: player,
									message: message,
									channel: channel,
									answer: null
								})
							})
							.then(() => playersInfo.get(player.id).message.react(answersEmojis[0]))
							.then(() => playersInfo.get(player.id).message.react(answersEmojis[1]))
							.then(() => playersInfo.get(player.id).message.react(answersEmojis[2]))
							.then(() => playersInfo.get(player.id).message.react(answersEmojis[3]))
							.catch(console.error);
					})
					.catch(console.error);
			})
		})
		.catch(console.error);

	guild.channels.cache.get(testChannel)
		.send({ embed: { description: 
			`ADMIN PANNEL

			⏩ Prochaine question
			🇦 🇧 🇨 🇩 Selectionner la bonne réponse`
		} })

		.then(message => { adminPannel = message })
		.then(() => adminPannel.react(nextQuestionEmoji))
		.then(() => adminPannel.react(answersEmojis[0]))
		.then(() => adminPannel.react(answersEmojis[1]))
		.then(() => adminPannel.react(answersEmojis[2]))
		.then(() => adminPannel.react(answersEmojis[3]))
		.catch(console.error);
}

function initDiscord() {
	let guild = client.guilds.cache.get(guildId)

	guild.members.fetch()
		.then(members => {
			let players = members.filter(m => m.roles.cache.some(r => r.id === rolesID.player))
			startConcours(guild, players)
		})
		.catch(g => { console.error("fail to load members" + g)})
}

function resetDiscord() {
	try {
		adminPannel.delete()
	} catch (error) {}

	playersInfo = new Map();
	deleteChannels()
}

function deleteChannels() {
	let guild = client.guilds.cache.get(guildId)

	guild.channels.cache.array().forEach(ch => {
		if (ch.name == 'LE GRAND CONCOURS' || (ch.parent != null && ch.parent.name == 'LE GRAND CONCOURS')) {
			ch.delete()
		}
	})
}

module.exports.start = startBot;
module.exports.launchNextQuestion = launchNextQuestion;