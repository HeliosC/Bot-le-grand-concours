//WS TO REMOVE AFTER UE
const http = require("http")
const StompServer = require('stomp-broker-js')

const WSPort = 61614
const server = http.createServer()
const stompServer = new StompServer({server: server})
server.listen(WSPort, () => {
    console.log(`WS port ${WSPort} listened`)
})

//HTTP
const express = require('express')

const HTTPPort = 3000
const app = express()
const router = express.Router()
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const serverHttp = app.listen(HTTPPort, () => {
    console.log(`HTTP port ${HTTPPort} listened`)
})

serverHttp.keepAliveTimeout = 30 * 1000;
serverHttp.headersTimeout = 35 * 1000;

router.post('/question', (req, res) => {
    console.log("request " + JSON.stringify(req.body))
    bot.launchNextQuestion(req.body, res)
})

router.get('/players', (req, res) => {
    console.log("/players " + JSON.stringify(req.body))
    bot.getPlayersData(res)
	//res.json(["a","b","c"])
})

app.use('/', router)

//DISCORD
const bot = require('./src/discord/bot')
bot.start(stompServer)