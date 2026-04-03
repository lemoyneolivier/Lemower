const config = require("./config.json");
var serialport = require('serialport');
const fs = require('fs');
const mapManagement = require("./maps.js");
const gardenMap = mapManagement.readFromFile(config.mapFileName);

/**
 * gestion de la carte et des obstacles.
 * en cas de pb : tourne sur lui-même et avance
 */
function managePosition(infos) {
  if (mapManagement.isInMap(gardenMap, infos.x, infos.y)) {
    // est-ce que je suis sur un obstacle
    if (mapManagement.checkSquare(gardenMap, infos) != 0) {
      // je suis dans la map
      mapManagement.setGrassCut(gardenMap, infos.x, infos.y);
      console.log("Position - Obstacle");
      angle = infos.dir;
      // recherche un angle de passage
      while (mapManagement.checkNextSquare(gardenMap, infos.x, infos.y, angle) != 0) {
        val = 90.0+Math.floor(Math.random()*180.0);
        angle = infos.dir+val;
      }
      console.log("Position - Tourne de "+val);
    }
  } else { // je sors de la map - donc je tourne de 180 °
    console.log("Position - Hors zone");
    val = 90.0+Math.floor(Math.random()*180.0);
      console.log("Position - Tourne de "+val);
  }
}

function onData(data) {
    console.log("Read "+data);
    ready = true;

    if (data.substr(0, 1) == "L" ) { // écrire dans des logs
      return console.log('DEBUG = '+data);
    }
    if (data.substr(0, 1) == "I" ) { // Récupère des informations sur le robot - chaque 500ms
      const words = data.split(" ");
      // gestion de l'interprétation des données 
      infos = {
        x: Number(words[1]), 
        y: Number(words[2]), 
        dir: Number(words[3]), 
        speed: Number(words[4]), 
        battery: Number(words[5]), 
        collision: Number(words[6]), 
      };

      var chaine=JSON.stringify(infos);
      console.log("Carte : \n",chaine);

      // gestion de la collision
      if (infos.collision != "0") {
        manageCollision(infos.collision);
      }
      if (infos.battery < 30) {
      //  manageReCharging(infos);
      }
      // manage the position of the robot : register cutting area 
      managePosition(infos);
    }
}

filename = process.argv.slice(2)[0];
testData = "";
if (fs.existsSync(filename)) {
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;    
        }
        test =data.split("\n");

        for (i = 0; i < test.length; i++) {
            info = test[i];
            if (info != "") {
                onData(test[i]);
            }
        }
    });
} else {
    console.error("File not found - "+filename);
}

