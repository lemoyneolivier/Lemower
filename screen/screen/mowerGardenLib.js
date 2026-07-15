/**************************************************************************************************
 * Mower garden management library in JS 
 * 
 * Module to manage a garden property
 *    read a garden
 *    add elements to garden
 *    generate a map reday to be used
 * 
 */

const { getMissions } = require("./mowerGardenMap.js");

fileSystem = require("fs");
mowerMap = require("./mowerGardenMap.js");

/***Class to manage the Garden */
module.exports = {

    gardenFileName : "",
    garden : {},
    angleGap : 10,
    stepSize : 10,
    gardenName : "Garden",
    map : {},
    path : {},
    missions : [],

    getNBObstacles : function () {
        return this.garden.obstacles.length
    },

    /** lecture du garden dans le fichier de configuration */
    readGarden : function (name) {
        gardenFileName = name; 
        fileSystem.readFile(gardenFileName, 'utf8', (err, data) => {
        if (err) {
    	    console.error(" file "+gardenFileName+" Not found");
            return;
        }
        this.garden = JSON.parse(data);
        // il faut maintenant construire la MAP
        var blocks = mowerMap.createBlocks(this.garden);
        this.map = mowerMap.createMap(this.garden, blocks);
        this.missions = mowerMap.getMissions(this.garden, this.map, blocks);
//        console.log("Missions : "+JSON.stringify(this.missions));
        //this.path = mowerMap.createPath(this.garden, this.map);
      });
    },

    /*****************************
     *  écriture du garden dans le fichier de configuration */
    writeGarden : function () {
        var gardData = {};
        if (this.garden.departure === undefined) {
            gardData.departure = {x:0, y:0};
        } else {
            gardData.departure = this.garden.departure;
        }
        gardData.points = [];
        gardData.points = gardData.points.concat(this.garden.points);
        gardData.obstacles = [];
        for (var i = 0; i < this.garden.obstacles; i++) {
            gardData.obstacles[i].points = gardData.obstacles[i].points.concat(this.garden.obstacles[i].points);
            gardData.obstacles[i].name = this.garden.obstacles[i].name;
        }
        gardData.lastUpdate = Date.now();
        var data = JSON.stringify(gardData);
        fileSystem.writeFileSync(gardenFileName, data);
    },

    /** Renomme un obstacle */
    updateName : function (obSID, newName) {
        garden.obstacles[obsID].name = newName;
        this.writeGarden();
    },

        /** Renomme un obstacle */
    cleanPoints : function (elem) {
        var o = this.getGardenElementID(elem);
        if (o == -1) {
            this.garden.points = [];
        } else {
            this.garden.obstacles[id].points = [];
        }
        this.writeGarden();
    },

    
    /*****************************
     *  récupère un obstacle ou le garden selon le nom 
     * **************************************/
    getGardenElementID : function (name) {
        if (name === this.gardenName) {
            return -1;
        }
        for (var i = 0; i < garden.obstacles.length; i++) {
            var obs = garden.obstacles[i];
            if (obs.name == name) {
                return i;
            }
        }
        return -10;
    },

        /*****************************
     *  récupère un obstacle ou le garden selon le nom 
     * **************************************/
    getGardenElement : function (name) {
        if (name === this.gardenName) {
            return this.garden;
        }
        for (var i = 0; i < garden.obstacles.length; i++) {
            var obs = garden.obstacles[i];
            if (obs.name == name) {
                return obs;
            }
        }
        return null;
    },

    /**********************************
     * ajoute un point dans le contour d'un element 
     */
    addPoint : function (rep, element) {
        var id = this.getGardenElementID(element);
        if (id == -1) {
            if (this.garden.points === undefined) {
                this.garden.points = [];
            }
            // arrondi des coordonnées à 1 chiffre après la virgule
            this.garden.points.push({x:Math.round(rep.x * 10) / 10, y:Math.round(rep.y * 10) / 10});
            rep.nbPoints = this.garden.points.length;
//            console.log("Add "+rep.nbPoints+" "+JSON.stringify(this.garden.points));
            this.writeGarden();
        } 
        if (id >= 0) {
            if (this.garden.obstacles[id].points === undefined) {
                this.garden.obstacles[id].points = [];
            }
            // arrondi des coordonnées à 1 chiffre après la virgule
            this.garden.obstacles[id].points.push({x:Math.round(rep.x * 10) / 10, y:Math.round(rep.y * 10) / 10});
            rep.nbPoints = this.garden.obstacles[id].points.length;
            this.writeGarden();
        }
        return rep;
    },

    // execute la prochaine etape de la mission en cours en fonction de la position du robot
    getNextStep : function (robotPosition) {
        var mission = this.missions[robotPosition.missionId];
        console.log("Mission = "+JSON.stringify(mission)+" "+JSON.stringify(robotPosition));

        var nextStep = mowerMap.getNextStep(this.map, mission, robotPosition);
        if (mission.isFinished == true) {
            robotPosition.missionId ++;
        }
        if (robotPosition.missionId >= this.missions.length) {
            robotPosition.missionId = 0;
            // mise à jour de la mission
            var blocks = mowerMap.createBlocks(this.garden);
            this.map = mowerMap.createMap(this.garden, blocks);
            this.missions = mowerMap.getMissions(this.garden, this.map, blocks);
            return null;
        } else {
            nextStep.mission = this.missions[robotPosition.missionId].name;
        }
        // si la fin des missions on revient à la première mission
        return nextStep;
    }


}
