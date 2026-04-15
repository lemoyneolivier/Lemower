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
const { execFile } = require('node:child_process');

const config = require("./config.json");

const fs = require('fs');
const mower = require('./mowerManager.js');
const garden = require("./maps.js");
const map = garden.readFromFile("./test/gardenMap.json");

var myPort;
var isConnected = false;

var isReady = false;



function connect () {

  if (isConnected == true) {
    console.log("Connected");
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
    console.log("No connexion available ");
    return;
  }

  console.log("port = "+targetPort);

  const { ReadlineParser } = require('@serialport/parser-readline');
  var SerialPort = serialport.SerialPort; 

  var logfile = config.replay+Date.now()+".txt";



  try  {

    myPort = new SerialPort( {path:targetPort, baudRate: parseInt(config.baudRate)});

    const parser = myPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))
    parser.on('data', onData);
    myPort.on('open', onOpen);  

    myPort.on('error', function(err) {
      console.log('Error: ', err.message)
    })


  } catch (error) {
    console.error(error);
    console.log("Error ");
    return;
  }
}

// Opens the connexion
connect ();

setInterval(connect, 5000);

/**
 * Ouverture du port de communication avec Arduino
 */
function onOpen() {
  try {
    console.log("Port is opened");
    isConnected = true;
    logfile = config.replay+Date.now()+".txt";
  } catch (error) {
    isConnected = false;
  }
}



/**
 * Réception de message venant de l'Arduino
 * @param {} data 
 */
function onData(data) {
    console.log("Read "+data);
    //     execLine : function(garden, replayName, ready, line) {
    ret = mower.execLine(map, logfile, isReady, data);
    if (ret != "") {
      isReady = true;
      myPort.write(ret+">", function(err) {
        if (err) {
          return console.log('Error on write: ', err.message)
        }
        console.log('w '+ret);
      });
    }
}
