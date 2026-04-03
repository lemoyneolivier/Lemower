// simulate the arduino
const MowerManager = require('./mowerManager.js');
const config = require("./config.json");

const mapManagement = require("./maps.js");
const gardenMap = mapManagement.readFromFile(config.mapFileName);

var ready = false;
now = new Date();
var replayName = config.replay+now.getTime()+".txt";

const SPEED = 2;

// Arduino data
var pos_x;
var pos_y;
var dir;
var speed;
var battery;

const speedRatio = 4; // number of seconds before starting

function init() {
    pos_x = 0.0;
    pos_y = 0.0;
    speed = 0.0;
    dir = 0.0;
    battery = 100;
}

/* runs the behaviour of the mower
    progressing by incrementation of the speed (speed = 1 -> 10 cm / step)
    decreasing the battery by 1 each 10 steps
**/
init();
MowerManager.execLine(gardenMap, replayName, false, "R ");
speed = 2;
noSteps = 0;
const intervalId = setInterval(() => {
    pas = speed*10; // en cm
    pos_x += Math.floor(pas*Math.cos(dir/180*Math.PI));  
    pos_y += Math.floor(pas*Math.sin(dir/180*Math.PI));  
    if ((noSteps% 10) == 0) battery --;

    // envoie les informations à la station
    // 3% de chance de collision
    collision = 0;
    if (Math.random() < 0.01) {
        collision = 1;
        speed = 0;
    }

    data = "I "+pos_x+" "+pos_y+" "+dir+" "+speed+" "+battery+" "+collision; 
    console.log("Step "+noSteps+" "+data);

    reponse = MowerManager.execLine(gardenMap, replayName, true, data); 
    console.log("Step reponse "+noSteps+" "+reponse);
    // selon la réponse : executer le changement
    const infos = reponse.split(" ");
    if (infos[0] == "a") { // avance
        speed = infos[1];
    }

    if (infos[0] == "t") { // tourne
        dir += parseInt(infos[1]);
        if (dir > 180) {
            dir -= 360;
        }
    }

    if (infos[0] == "v") { // recule et tourne
        pas = 20;
        pos_x -= Math.floor(pas*Math.cos(dir/180*Math.PI));  
        pos_y -= Math.floor(pas*Math.sin(dir/180*Math.PI));  

        dir += parseInt(infos[1]);
        if (dir > 180) {
            dir -= 360;
        }
        if (infos.length > 2) {
            speed = infos[2];
        } else {
            speed = 2;
        }
    }
    noSteps ++;
}, 500);

