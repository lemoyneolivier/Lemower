const prompt = require('prompt');
var serialport = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline')

var SerialPort = serialport.SerialPort; 
myPort = new SerialPort( {path:'/dev/ttyACM0', baudRate: 115200});

const parser = myPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))
parser.on('data', console.log)


myPort.on('open', onOpen);
myPort.on('data', onData);

myPort.on('error', function(err) {
  console.log('Error: ', err.message)
})

function onOpen() {
    console.log("Port is opened");
}

function onData(data) {
    console.log("Read "+data);
    if (data == "R") { //Arduino est prete 
        prompting();
    }

    if (data.substr(0, 1) == "L" ) { // écrire dans des logs

    }
}


function prompting () {
    prompt.start();

    prompt.get(['commande'], function (err, result) {
        if (err) { return onErr(err); }
        console.log('Entrée envoyé à la ligne de commande :');
        console.log(result.commande);

        myPort.write(result.commande+">", function(err) {
        if (err) {
        return console.log('Error on write: ', err.message)
        }
        console.log('message written')
    })
    });
}

function onErr(err) {
    console.log(err);
    return 1;
}





