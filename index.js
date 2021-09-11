//WS
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

app.listen(HTTPPort, () => {
    console.log(`HTTP port ${HTTPPort} listened`)
})

router.post('/question', (req, res) => {
    bot.launchNextQuestion(req.body)
    res.json({ prout: 4242 })
})

app.use('/', router)

//DISCORD
const bot = require('./src/discord/bot')
bot.start(stompServer)