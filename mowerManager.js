const fs = require('fs');
const config = require("./config.json");

const mapManagement = require("./maps.js");

var lastPosition= {
    "x" : 0,
    "y" : 0,
    "speed" : 0
};


module.exports = {  

    execLine : function(garden, replayName, ready, line) {
        content = line+"\n";
        fs.appendFile(replayName, content, err => {
        if (err) {
            console.error(err);
        } 
        });
        console.log("Appel "+line+" "+ready);

        data = line;
        if (data.substr(0, 1) == "R") { //Arduino est prete     val = 90+Math.floor(Math.random*180.0);
            ready = true;
            return("a "+config.speed);
        }
        
        if (data.substr(0, 1) == "L" ) { // écrire dans des logs
            console.log('DEBUG = '+data);
            return "";
        }
        if (ready == false) {
            return "";
        }
        if (data.substr(0, 1) == "I" ) { // Récupère des informations sur le robot - chaque 500ms
            const words = data.split(" ");
            // gestion de l'interprétation des données 
            infos = {
                x: parseInt(words[1]), 
                y: parseInt(words[2]), 
                dir: parseInt(words[3]), 
                speed: parseInt(words[4]), 
                battery: parseInt(words[5]), 
                collision: parseInt(words[6]), 
                garden: garden,
                speed : 0
            };

            // calcul de la vitesse 
            var speed = 0;
            if (lastPosition.x != undefined) {
              speed = Math.sqrt(Math.pow(infos.x-lastPosition.x, 2) + Math.pow(infos.y-lastPosition.y, 2));
            }

            lastPosition = {
              x : infos.x,
              y : infos.y,
              speed : speed
            }

            infos.speed = speed;

            // gestion de la collision
            if (infos.collision != 0) {
                console.log("Collision !");
                return manageCollision(infos);
            }
            if (infos.battery < 30) {
            //return manageReCharging(infos);
            }
            // manage the position of the robot : register cutting area 
            return managePosition(infos);
        }
    }
}



// calcul l'angle d'achapatoire le plus adequat
// retourne un angle
function findTheWay(infos) {
  angleDir = 0;
  chk = true;
  while ((chk) && (angleDir < 360)) {
    angleDir = angleDir+45;
    chk = mapManagement.checkNextSquare(infos.garden, infos.x, infos.y, infos.dir+angleDir, infos.speed);
    console.log("Ajoute 45 = "+angleDir+" -> "+chk);
  }
  return angleDir;
}

/**
 * gestion de la carte et des obstacles.
 * en cas de pb : tourne sur lui-même et avance
 */
function managePosition(infos) {
  if (mapManagement.isInMap(infos.garden, infos.x, infos.y)) {
    // est-ce que je suis sur un obstacle
    if (mapManagement.checkSquare(infos.garden, infos)) {
      // je suis dans la map
      mapManagement.setGrassCut(infos.garden, infos.x, infos.y);
      console.log("Position - Obstacle "+mapManagement.getPosition(infos.garden, infos.x, infos.y));
      // recherche un angle de passage
      angle = findTheWay(infos);
      return("t "+Math.floor(angle)); // je tourne
    } else {
      mapManagement.setGrassCut(infos.garden, infos.x, infos.y);
    }
  } else { // je sors de la map - donc je tourne de 180 °
    console.log("Position - Hors zone");
    angle = findTheWay(infos);
    return("t "+angle); // je tourne
  }
  return "K"; // Keep alive
}

/** stoppe le Retourne à la base 
 * le plus compliqué à faire
 * - TODO  */
function manageReCharging(infos) {

}



/**
 * gestion de la carte et des obstacles.
 * en cas de pb : tourne sur lui-même et avance
 */
function manageCollision(infos) {
  angle = findTheWay(infos);
  return("v "+angle); // je recule et je tourne
}
