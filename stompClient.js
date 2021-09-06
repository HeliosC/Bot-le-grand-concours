var Stomp = require('stompjs');

var client = Stomp.overWS('ws://localhost:61614/stomp');

client.connect({}, () => {
    console.log('SUCCESS', arguments);
    client.send("/displayAnswers", {}, "Hello, STOMP");
}, () => {
    console.log('FAILURE', arguments);
});