//WS TO REMOVE AFTER UE
//const http = require("http")
//const StompServer = require('stomp-broker-js')

//const WSPort = 61614
//const server = http.createServer()
//const stompServer = new StompServer({server: server})
//server.listen(WSPort, () => {
//    console.log(`WS port ${WSPort} listened`)
//})

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
    console.log("POST /question " + JSON.stringify(req.body))
    bot.launchNextQuestion(req.body, res)
})

router.get('/players', (req, res) => {
    console.log("GET /players")
    bot.getPlayersData(res)
	//res.json(["a","b","c"])
})

var savedData
router.post('/save', (req, res) => {
    console.log("POST /save " + JSON.stringify(req.body))
    savedData = req.body
    res.json()
})

router.get('/retrieve', (req, res) => {
    console.log("GET /retrieve ")
    res.json(savedData)
})

app.use('/', router)

//DISCORD
const bot = require('./src/discord/bot')
bot.start()