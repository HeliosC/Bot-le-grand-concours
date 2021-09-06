const { Client, Message, MessageReaction, User, ReactionEmoji, Intents, Guild, GuildMember } = require("discord.js");
const { isMod } = require("./utils");
const { commandPrefix, rolesID, guildId, testChannel } = require("./constants");

//donno if I can use it bc the UE project doesn't handle that
const states = {
	WELCOME: "state_welcome",
	QUESTION: "state_question",
	SUSPENS: "state_suspens",
	ANSWER: "state_answer"
}

const state = states.WELCOME

const answersEmojis = ["🇦", "🇧", "🇨", "🇩"];
const answerEmojiMap = { "🇦": "A", "🇧": "B", "🇨": "C", "🇩": "D" };
// const answersStr = ["A", "B", "C", "D"];
const nextQuestionEmoji = '⏩'

var playersInfo = new Map();
var nQuestion = 0
var timeRemaining = 0

var client
var questionData
var adminPannel
var stompServer

function startBot(mStompServer) {
	stompServer = mStompServer

	const botClient = new Client();

	botClient.on('ready', () => { 
		console.log(`Logged in !`) 
	});
	botClient.on('error', (e) => console.error(e));
	botClient.on('warn', (e) => console.warn(e));
    botClient.on('debug', (e) => console.info(e));

    botClient.on('message', (message) => onMessage(message));
	botClient.on('messageReactionAdd', (reaction, user) => onReactionAdd(reaction, user));
	botClient.on('messageReactionRemove', (reaction, user) => onReactionRemove(reaction, user));
    
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

//TODO DONT DUPLICATE onReactionAdd AND onReactionRemove
/** 
 * @param {MessageReaction} reaction 
 * @param {User} user 
 * */
 function onReactionRemove(reaction, user) {
	// if (user.bot) return

	// let member = reaction.message.guild.member(user)
	// if (isMod(member, reaction.message.guild) && reaction.message.id == adminPannel.id) {
	// 	reaction.users.remove(user.id)
	// } else if (playersInfo.has(user.id) && playersInfo.get(user.id).message.id == reaction.message.id) {
	// 	reaction.users.remove(user.id)
	// } else if (reaction.message.id != adminPannel.id){
	// 	return
	// }
}

/** 
 * @param {MessageReaction} reaction 
 * @param {User} admin 
 * */
function onAdminPannelReact(reaction, admin) {
	const reactionEmoji = reaction.emoji.toString()
	if (reactionEmoji == nextQuestionEmoji) {
		launchNextQuestion({ question: "question", a:"a", b:"b", c:"c", d:"d" })
		adminPannel.reactions.cache.array().forEach(r => r.users.remove(admin.id))
	} else if (answersEmojis.includes(reactionEmoji)) {
		revealAnswer(reactionEmoji)
	} else {
		reaction.users.remove(admin.id)
	}
}

function launchNextQuestion(mQuestionData) {
	questionData = mQuestionData
	if (timeRemaining != 0) return
	nQuestion += 1
	timeRemaining = 10
	playersInfo.forEach((playerInfo, playerID) => {
		playerInfo.answer = null
		playersInfo.set(playerID, playerInfo)
	})
	updateQuestionMessage()
	countdown()
}

function updateQuestionMessage(correctAnswer) {
	let timeMessage = `Temps restant : ${timeRemaining} seconde${timeRemaining > 1 ? "s" : ""}`
	if (timeRemaining == 0) {
		timeMessage = 'Temps écoulé'
	}

	adminPannel.edit(
		{ embed: { description: 
			`ADMIN PANNEL - DEV ONLY
			Question n° ${nQuestion}
			${timeMessage}

			⏩ Prochaine question
			🇦 🇧 🇨 🇩 Selectionner la bonne réponse`
		} }
	)

	playersInfo.forEach((playerInfo, _) => {
		let answer = playerInfo.answer ?? ''
		let answerMessage = `Votre réponse : ${answer}`
		if (timeRemaining == 0 && !playerInfo.answer) {
			answerMessage = 'Vous n\'avez pas répondu'
		}
		if (correctAnswer != undefined) {
			answerMessage += ` ` + (playerInfo.answer == correctAnswer ? '🟢' : '🔴')
		}
		playerInfo.message.edit(
			{ embed: { description: 
				`Question n° ${nQuestion}
				${questionData.question}
				🇦 ${questionData.a}
				🇧 ${questionData.b}
				🇨 ${questionData.c}
				🇩 ${questionData.d}
				${timeMessage}

				Utilisez 🇦 🇧 🇨 🇩 pour répondre
				${answerMessage}`
			} }
		)
	})
}

/** @param {String} answer */
function revealAnswer(answer) {
	// updateQuestionMessage(answer)

	// let answers = []
	// playersInfo.forEach((playerInfo, playerID) => {
	// 	playerInfo.message.reactions.cache.array().forEach(r => r.users.remove(playerID))
	// 	answers.push(answerEmojiMap[playerInfo.answer])
	// })
	// console.log("answers")
	// console.log(answers)
	// stompServer.send('/displayAnswers', {}, JSON.stringify({ answers: answers }));
}

/** @param {String} answer */
function retrieveAnswers() {
	let answers = []
	playersInfo.forEach((playerInfo, playerID) => {
		answers.push(answerEmojiMap[playerInfo.answer])
		playerInfo.message.reactions.cache.array().forEach(r => r.users.remove(playerID))
	})
	console.log("answers")
	console.log(answers)
	stompServer.send('/displayAnswers', {}, JSON.stringify({ answers: answers }));
}

function countdown() {
    countdownTimeoutId = setTimeout(() => {
        if (timeRemaining > 0) {
			console.log("cd " + timeRemaining)
            timeRemaining -= 1;
            updateQuestionMessage();
            countdown();
        } else {
			console.log("cd end")
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
	if (!answersEmojis.includes(reaction.emoji.toString()) || timeRemaining == 0 || playersInfo.get(user.id).answer != null) {
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
			initConcours()
			break;
		case 'reset':
			resetConcours();
			break;
	}
}

/** 
 * @param {Guild} guild 
 * @param {GuildMember[]} players 
 * */
function startConcours(guild, players) {
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
							.send({ embed: { description: 
								`Bienvenue ${player.user.tag} !`
							} })
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

	guild.channels.cache.get(testChannel) //channel
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

function initConcours() {
	let guild = client.guilds.cache.get(guildId)

	guild.members.fetch()
		.then(members => {
			let players = members.filter(m => m.roles.cache.some(r => r.id === rolesID.player))
			startConcours(guild, players)
		})
		.catch(g => { console.error("fail to load members" + g)})
}

function resetConcours() {
	//delete messages and channels
	// adminPannel.delete()
	nQuestion = 0
	playersInfo = new Map();
	deleteChannels()
}

function deleteChannels() {
	let guild = client.guilds.cache.get(guildId)

	guild.channels.cache.array().forEach(ch => {
		if (ch.name == 'LE GRAND CONCOURS' || (ch.parent != null && ch.parent.name == 'LE GRAND CONCOURS')) {
			console.log(ch.name)
			ch.delete()
		}
	})
}

module.exports.start = startBot;
module.exports.initDiscord = initConcours;
module.exports.launchNextQuestion = launchNextQuestion;
module.exports.revealAnswer = revealAnswer;
module.exports.resetConcours = resetConcours;