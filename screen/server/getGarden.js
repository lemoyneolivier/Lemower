const fs = require('fs');


/** Variable globale - jardin général */
var garden = {};
var blockSize = 10;

/*****
 * Main execution - testing des fonctions
 */
garden = {
    departure: {
        x: 0,
        y: 30
    },
    points: [
        {x: 0, y: 0},
        {x: 0, y: 20}, 
        {x: -40, y: 20},
        {x: -40 ,y: 0},
        {x: -240 ,y: 0},
        {x: -240 ,y: 60},
        {x: -360 ,y: 60},
        {x: -360 ,y: 0},
        {x: -560 ,y: 10},
        {x: -560 ,y: 50},
        {x: -640 ,y: 60},
        {x: -640 ,y: 15},
        {x: -740 ,y: 17},
        {x: -720 ,y: 810},
        {x: -320 ,y: 810},
        {x: -320 ,y: 700},
        {x: -120 ,y: 708},
        {x: -120 ,y: 740},
        {x: 283 ,y: 760},
        {x: 283 ,y: 630},
        {x: 383 ,y: 630},  
        {x: 383 ,y: 0},
        {x: 40 ,y: 0},
        {x: 40 ,y: 20}
    ],
    obstacles : [
        {
            name: "obstacle1",
            points: [
                {x: -100, y: 100},
                {x: -100, y: 200},
                {x: -200, y: 200},
                {x: -200, y: 100}
            ] 
        },
        { 
            name: "obstacle2",
            points: [
                {x: -500, y: 150},
                {x: -520, y: 200},
                {x: -540, y: 210},
                {x: -540, y: 260},
                {x: -500, y: 310}
            ]  
        }
    ]
}


fs.writeFileSync('screen/garden.json', JSON.stringify(garden));