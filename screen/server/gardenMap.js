const fs = require('fs');
const gardenMap = require('../screen/mowerGardenMap.js');

var gdata = fs.readFileSync ("../screen/garden.json"); 
var garden = JSON.parse(gdata);

/** Calcul des zones */ 
var bounds = gardenMap.getBounds(garden);
console.log(bounds);
for (var i = 0; i < garden.obstacles.length; i++) {
    var obstacle = garden.obstacles[i];
    var obstacleBounds = gardenMap.getBounds(obstacle);
    garden.obstacles[i].bounds = obstacleBounds;
}

var lst = gardenMap.createBlocks(garden);
for (var i = 0; i < garden.obstacles.length; i++) {
    var obstacle = garden.obstacles[i];
    if (obstacle.points.length > 0) {
        console.log("Obstacle "+i+" : ");
        var obstacleBlocks = gardenMap.createBlocks(obstacle);
        console.log(" : "+obstacleBlocks.length+" blocks");
        obstacle.blocks = obstacleBlocks;
        lst = lst.concat(obstacleBlocks);
        garden.obstacles[i].blocks = obstacleBlocks;
    }
}
var map = gardenMap.createMap(garden, lst);
garden.map = map;
fs.writeFileSync('../screen/gardenMap.json', JSON.stringify(garden));