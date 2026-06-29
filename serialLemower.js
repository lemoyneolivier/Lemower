/**
 * Programme de pilotage de l'arduino
 * 
 * Argument - position du fichier de configuration
 * 
 * > communique avec l'Arduino
 * > pilote les limites de terrain par rapport à une carte (carreaux de 10 cm de coté)
 * > pilote la surface réellement découpée
 * > pilote l'exécution de la découpe
 * > retour à la base en cas de manque de batterie
 * 
 */

var serialport = require('serialport');
const { execFile } = require('node:child_process');
const fs = require('fs');

var orderList= [];

var config = {};
if (process.argv.length > 2) {
  if (fs.existsSync(process.argv[2])) {
    let rawdata = fs.readFileSync(process.argv[2]);
    config = JSON.parse(rawdata);
  } else { 
    console.error("Defined config file not found !\n"+process.argv[2]);
    return 1;
  }
} else  {
  if (fs.existsSync("./config.json")) {
    let rawdata = fs.readFileSync("./config.json");
    config = JSON.parse(rawdata);
  } else {
    console.error("Default config file not found !");
    return 1;
  }
}

const mower = require('./mowerManager.js');
const garden = require("./maps.js");
const map = garden.readFromFile("./test/gardenMap.json");
var logfile = "";

var myPort;
var isConnected = false;
var orderSent = false;

var isReady = false;


function log(msg ) {
  if (logfile != "") {
    fs.appendFileSync(logfile, "L "+Date.now()+" "+msg+"\n");
  } else {
    console.log("L "+Date.now()+" "+msg+"\n");
  }
}

function connect () {

  if (isConnected == true) {
    log("Connected");
    return;
  } 

  targetPort = "Not found";
  if (fs.existsSync ("/dev/ttyACM0")) {
    targetPort = "/dev/ttyACM0";
  }
  if (fs.existsSync ("/dev/ttyACM1")) {
    targetPort = "/dev/ttyACM1";
  }

  if (targetPort == "Not found") {
    log("No connexion available ");
    return;
  }

  log("port = "+targetPort);

  const { ReadlineParser } = require('@serialport/parser-readline');
  var SerialPort = serialport.SerialPort; 

  logfile = config.replay+Date.now()+".txt";



  try  {

    myPort = new SerialPort( {path:targetPort, baudRate: parseInt(config.baudRate)});

    const parser = myPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))
    parser.on('data', onData);
    myPort.on('open', onOpen);  

    myPort.on('error', function(err) {
    log('Error: ', err.message)
    })


  } catch (error) {
    console.error(error);
    log("Error "+error);
    return;
  }
}

// Opens the connexion
connect ();

setInterval(connect, 10000);

/**
 * Ouverture du port de communication avec Arduino
 */
function onOpen() {
  try {
    logfile = config.replay+Date.now()+".txt";
    log("Port is opened");
    isConnected = true;
  } catch (error) {
    isConnected = false;
  }
}

function reply (cmd) {
  isReady = true;
  if (orderSent == true) {
    return -1;
  }
  myPort.write(cmd+">", function(err) {
    if (err) {
      return console.log('Error on write: ', err.message)
    }
    orderSent = true;
    log('w '+ret);
  });
}



/**
 * Réception de message venant de l'Arduino
 * @param {} data 
 */
function onData(data) {
    log("Read "+data);
    if (data == "Done") { 
      //est dispo pour le prochain message
      orderSent = false;
      // envoie le message suivant si possible
      if (orderList.length > 0) {
        var msg = orderList.shift(); 
        reply(msg);
      }
    } else {
      //     execLine : function(garden, replayName, ready, line) {
      ret = mower.execLine(map, logfile, isReady, data);
      if (ret.length > 0) {
        for(var i = 0; i < ret.length; i++) {
          // ajoute la ou les commandes dans le pipeline d'execution 
          orderList.push(ret[i]);
        }
        if (orderSent == false) {
          if (orderList > 0) {
            order = orderList.shift();
          // execute la commande 
          if (order.startsWith("exec ")) { // simple commande
            reply (order.substring(5)); 
          }
        }
      }
    }
}
