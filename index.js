const bot = require('./src/discord/bot');
const express = require('express')
var http = require("http");
var StompServer = require('stomp-broker-js');

//WS
var server = http.createServer();
var stompServer = new StompServer({server: server});
server.listen(61614);

bot.start(stompServer)

// stompServer.on('connecting', () => {
//     console.log('CONNECTING')
//     setTimeout(() => {
//         stompServer.send('/displayAnswers', {}, JSON.stringify({ answers: ["A", "B", "C", "D", "A", "B", "C", "D", "B"] }));
//     }, 5000);
// });

// stompServer.subscribe("/**", function(msg, headers) {
//   var topic = headers.destination;
//   console.log(topic, "->", msg);
// });

//HTTP
const app = express()
const port = 3000
const router = express.Router();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.listen(port, () => {
    console.log("j'ecoute")
})

router.post('/question', (req, res) => {
    console.log("post question")
    // stompServer.send('/displayAnswers', {}, 'testMsg');

    bot.launchNextQuestion(req.body)
    res.json({ prout: 4242 })
})

app.use('/', router)