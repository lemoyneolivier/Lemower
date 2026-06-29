/**************************************************************************************************
 * Mower garden management library in JS 
 * 
 * Module to manage a garden property
 *    read a garden
 *    add elements to garden
 *    generate a map reday to be used
 * 
 */

fileSystem = require("fs");

/***Class to manage the Garden */
module.exports = {

    gardenFileName : "",
    garden : {},
    angleGap : 10,
    stepSize : 10,
    gardenName : "Garden",

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
        garden = JSON.parse(data);
      });
    },

    /*****************************
     *  écriture du garden dans le fichier de configuration */
    writeGarden : function () {
        garden.lastUpdate = Date.now();
        var data = JSON.stringify(garden);
        fileSystem.writeFileSync(gardenFileName, data);
    },

    /** Renomme un obstacle */
    updateName : function (obSID, newName) {
        garden.obstacles[obsID].name = newName;
    },

        /** Renomme un obstacle */
    cleanPoints : function (elem) {
        var o = this.getGardenElement(elem);
        o.points= [];
    },

    
    /*****************************
     *  récupère un obstacle ou le garden selon le nom 
     * **************************************/
    getGardenElement : function (name) {
        if (name === this.gardenName) {
            return garden;
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
        var elem = this.getGardenElement(element);
        if (elem != null) {
            elem.points.push(rep);
            rep.nbPoints = elem.points.length;
                // sauvegarde le jardin
            this.writeGarden();
        } else {
            console.log("Element not found : "+element);
        }
        return rep;
    }
}
