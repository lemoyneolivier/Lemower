/**
 * Programme de pilotage de l'arduino
 * 
 * > communique avec l'Arduino
 * > pilote les limites de terrain par rapport à une carte (carreaux de 10 cm de coté)
 * > pilote la surface réellement découpée
 * > pilote l'exécution de la découpe
 * > retour à la base en cas de manque de batterie
 * 
 */
var serialport = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline')

var SerialPort = serialport.SerialPort; 
myPort = new SerialPort( {path:'/dev/ttyACM0', baudRate: 9600});

const parser = myPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))
parser.on('data', onData);

/**Map of the area to cut
const maps = {
    min_x = -5,
    min_y = 5,
    nb_x = 200,
    nb_y = 200,
    map = [],
    cutt = []}; 

myPort.on('open', onOpen);
//myPort.on('data', onData);


myPort.on('error', function(err) {
  console.log('Error: ', err.message)
})

/**
 * Ouverture du port de communication avec Arduino
 */
function onOpen() {
    console.log("Port is opened");
}

/**
 * Réception de message venant de l'Arduino
 * @param {} data 
 */
function onData(data) {
    console.log("Read "+data);
    if (data == "R") { //Arduino est prete 
        prompting();
    }

    if (data.substr(0, 1) == "L" ) { // écrire dans des logs

    }
    if (data.substr(0, 1) == "I" ) { // Récupère des informations sur le robot - chaque 500ms
      const words = data.split(" ");
      //TODO : gestion de l'interprétation des données 
      infos = {
        x: words[1], 
        y: words[2], 
        dir: words[3], 
        speed: words[4], 
        battery: words[5], 
        collision: words[6], 
      };
      // gestion de la collision
      if (infos.collision != "0") {
        manageCollision(infos.collision);
      }
      if (infos.battery < 30) {
        manageReCharging(infos);
      }
      // manage the position of the robot : register cutting area 
      managetPosition(infos);
    }
}
/***
 * Fonction pour écrire une commande vers ARDUINO
 */
function writeToArduino (cmd) {
  myPort.write(cmd+">", function(err) {
    if (err) {
      return console.log('Error on write: ', err.message)
    }
    console.log('w '+cmd);
  });
}





