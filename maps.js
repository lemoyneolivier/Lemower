
module.exports = class Maps {

  constructor() {
  }
}

    SQUARE = 20;

/**
 * Map of the area to cut one square = 20 x 20 cm 
 *
const map = {
    min_x : 0,
    min_y : -25,
    nb_x : 75,
    nb_y : 50,
    obstacles : [],
    costMap : []
};

**/

/*** Lecture depuis un fichier */
module.exports.readFromFile = function(fName) {
    const gardenMap = require(fName);
    this.buildCostMap(gardenMap);

    return gardenMap;
}


/**   return the map zone  max / min X/ Y **/
module.exports.getBounds = function () {
     return map.zone;
}

/**   return the map cost array **/
module.exports.getCostMap = function () {
     return map.costMap;
}


/****
 * Build Cost Map : construit une liste de carreaux avec un statut : 0 = ok, 1 = ko
 */
module.exports.buildCostMap = function (map){
    // parcours la liste des carrés pour déterminer s'il sont dans ou hors des obstacles
    pos = 0;
    map.costMap = [];
    map.grassCut = [];
//    for (px = map.zone.min_x; px <= map.zone.min_x+map.zone.nb_x; px ++) {
//    for (py = map.zone.min_y; py <= map.zone.min_x+map.zone.nb_y; py ++) {
    for (px = 0; px < map.zone.nb_x; px ++) {
     for (py = 0; py < map.zone.nb_y; py ++) {
           val = 0;
           vx = px + map.zone.min_x;
           vy = py + map.zone.min_y;
            for (idx = 0; (idx < map.obstacles.length)&(val == 0); idx ++) {
                obs = map.obstacles[idx];
                if (vx >= (obs.min.x)&(vx <= obs.min.x+obs.size.x)) {
                    if (vy >= (obs.min.y)&(vy <= obs.min.y+obs.size.y)) {
                        val = 1;
                    }
                } 
            }
            map.costMap[pos] = val;
            map.grassCut[pos++] = 0;
        }
    }
}

module.exports.getSquare= function (map, x, y) {
    maCaseX = Math.floor((x-map.zone.min_x*20.0)/20.0);
    maCaseY = Math.floor((y-map.zone.min_y*20.0)/20.0);
    return maCaseX*map.zone.nb_y+maCaseY;
}


module.exports.getPosition= function (map, x, y) {
    maCaseX = Math.floor((x-map.zone.min_x*20.0)/20.0);
    maCaseY = Math.floor((y-map.zone.min_y*20.0)/20.0);
    return maCaseX+" "+maCaseY;
}


/***
 * retourne 0 ou 1 selon que la case suivante (avec l'angle)
 * vérifier si hors zone aussi
 */
module.exports.checkNextSquare= function (map, x, y, dir, speed) {
    // next direction
    angle = dir/180*Math.PI;
    newX = Math.floor(x + Math.cos(angle)*speed);
    newY = Math.floor(y + Math.sin(angle)*speed);

    console.log("Obstacle - checkdir "+dir+" "+x+" "+y+" "+newX+" "+newY);

    if (!this.isInMap(map, newX, newY)) {
        console.log("out ");
        return true;
    }

    id = this.getSquare(map, newX, newY);
    if (map.costMap[id] == 1) {
        console.log("Obstacle - checkdir "+dir+" ok");
        return true;
    }
    return false;
}

/**
 * Retourne 0 si tout va bien (case courante et case suivante)
 * infos = informations du robot
 */
module.exports.checkSquare= function (map, infos) {
    id = this.getSquare(map, infos.x, infos.y);
    if (map.costMap[id] == 1) {
        console.log("Found obstacle - "+id+" "+infos.x+", "+infos.y);
        return true;
    }
    return false;
}

/**
 * Retourne 0 si tout va bien (case courante et case suivante)
 * infos = informations du robot
 */
module.exports.setGrassCut= function (map, x, y) {
    id = this.getSquare(map, x, y);
    map.grassCut[id] = 1;
}

/** 
 * retourne vrai ou faux si les coordonnées sont dans la carte 
 *  compare les coordonnées en cm avec les coordonnées de la carte
 */
module.exports.isInMap = function (map, x, y) { // x et y sont donnés en cm

    if (x >= (map.zone.min_x+map.zone.nb_x)*20.0) return false;
    if (x < (map.zone.min_x)*SQUARE) return false;

    if (y >= (map.zone.min_y+map.zone.nb_y)*20.0) return false;
    if (y < (map.zone.min_y)*20.0) return false;
  

    return true;
}


/** 
const gardenMap = readFromFile("./test/gardenMap.json");

var chaine=JSON.stringify(gardenMap);
console.log("Carte : \n",chaine);
**/
