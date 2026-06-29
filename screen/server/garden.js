const fs = require('fs');


/*****************************************
 *   TODO : 
 *     - faire le tour de la carte
 *     - gerer la validation des interdits vis à vis des obstacles
 *             - pas d'obstacles qui coupent la carte
 *             - pas d'obstacles adjacents à la carte
 */


/** Variable globale - jardin général */
var garden = {};
var blockSize = 10;


//** calcule la boite englobante du jardin / obstacle*/
function getBounds (map) {
    var points = map.points;
    var bounds = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity
    };
    for (var i = 0; i < points.length; i++) {
        var point = points[i];
        if (point.x < bounds.minX) {
            bounds.minX = point.x;
        }   
        if (point.x > bounds.maxX) {
            bounds.maxX = point.x;
        }   
        if (point.y < bounds.minY) {
            bounds.minY = point.y;
        }   
        if (point.y > bounds.maxY) {
            bounds.maxY = point.y;
        }   
    }
    map.bounds = bounds;
    return bounds;
}

/***
 * Détermine si un point (x, y) est à l'intérieur du jardin ou d'un obstacle
 ****** Ne fonctionne pas **/
function isInMap (map, x, y) {
    // vérifie que le point est dans la boite englobante du jardin
    var bounds = map.bounds;
    if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
//        console.log("out of bounds : ");
        return false;
    }
    var points = map.points;
    var isIn = false;   
    var pointA = points[0];
    var xAngleA = pointA.x - x;
    var yAngleA = pointA.y - y;
    var somAngle = 0;
    var nb = 0;
//    console.log("Départ : " + pointA.x+","+pointA.y);
    for (var i = 1; i < points.length+1; i++) {
        var pointB = points[i%points.length];
        // calcule l'angle entre les points A et B et le point (x, y)
        var xAngleB = pointB.x - x;
        var yAngleB = pointB.y - y;

        var a2 = xAngleA * xAngleA + yAngleA * yAngleA;
        var b2 = xAngleB * xAngleB + yAngleB * yAngleB;
        var c2 = (pointB.x - pointA.x) * (pointB.x - pointA.x) + (pointB.y - pointA.y) * (pointB.y - pointA.y);
        var cosAngle = (a2 + b2 - c2) / (2 * Math.sqrt(a2) * Math.sqrt(b2));

        var angle = Math.acos(cosAngle);
        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
        }
        angle = angle - somAngle;
        somAngle += angle;
//            console.log(i+" Angles : "+a2+" "+b2+" "+c2+" - "+angle*180/Math.PI+" "+pointB.x+","+pointB.y+" - "+somAngle*180/Math.PI);
        nb ++;
    }
//    console.log("Somme des angles : " + somAngle%Math.PI+" - "+somAngle*180/Math.PI%360);
    return (Math.abs(somAngle%Math.PI) < Math.PI/10.0);
}

/******************************************************************************************************
 * calcule les coordonnées d'une ligne droite entre deux points (x1, y1) et (x2, y2) en utilisant l'algorithme de Bresenham
 */
function calcStraightLine (startCoordinates, endCoordinates) {
    var coordinatesArray = new Array();
    // Translate coordinates
    var x1 = startCoordinates.x;
    var y1 = startCoordinates.y;
    var x2 = endCoordinates.x;
    var y2 = endCoordinates.y;
    // Define differences and error check
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var sx = (x1 < x2) ? 1 : -1;
    var sy = (y1 < y2) ? 1 : -1;
    var err = dx - dy;
    // Set first coordinates
//    coordinatesArray.push(new Coordinates(y1, x1));
    // Main loop
    while (!((x1 == x2) && (y1 == y2))) {
        var e2 = err << 1;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
        // Set coordinates
        coord = {
            x : x1,
            y : y1
        }
        coordinatesArray.push(coord);
    }
    // Return the result
    return coordinatesArray;
}


function getBlock (map, point) {
    var midx = map.bounds.minX + (map.bounds.maxX - map.bounds.minX)/2;
    var midy = map.bounds.minY + (map.bounds.maxY - map.bounds.minY)/2;
    var minX = Math.floor(garden.bounds.minX / blockSize);
    var minY = Math.floor(garden.bounds.minY / blockSize);
    var taux = 0.1;
    var valx= Math.floor(point.x / blockSize);
    var valy= Math.floor(point.y / blockSize);
    // la tollérence s'applique sur les bords dans le sens de l'intérieur du jardin
    if ( (point.x <  midx) && (Math.abs(point.x % blockSize) > blockSize * (1- taux)) ) {
        valx ++;
    } 
    if ( (point.x >  midx) && (Math.abs(point.x % blockSize) < blockSize * taux) ) {
        valx --;
    } 
    if ( (point.y <  midy) && (Math.abs(point.y % blockSize) > blockSize * (1- taux)) ) {
        valy ++;
    } 
    if ( (point.y >  midy) && (Math.abs(point.y % blockSize) < blockSize * taux) ) {
            valy --;
    } 
    var block = {
        x: valx - minX,
        y: valy - minY
    };
    return block;
}

/**********************************************************************
 *  cree une grille de blocs à partir du jardin et des obstacles
 *      gestion de la position du point dans le bloc.
 **********************/
function createBlocks(map) {
    // simplification de la carte sous la forme de liste de blocs
    var blocks = [];
    var midx = map.bounds.minX + (map.bounds.maxX - map.bounds.minX)/2;
    var midy = map.bounds.minY + (map.bounds.maxY - map.bounds.minY)/2;
    console.log("Mid : " + midx + "," + midy);
    // itère sur les points du jardin
    for (var i = 0;  i < map.points.length; i++ ) {
        var point = map.points[i];
        // Gestion d'une tollérence. Si le point est proche du bord d'un bloc, on considère qu'il appartient au bloc voisin
        var taux = 0.1;
        var valx= Math.floor(point.x / blockSize);
        var valy= Math.floor(point.y / blockSize);
        // la tollérence s'applique sur les bords dans le sens de l'intérieur du jardin
        if ( (point.x <  midx) && (Math.abs(point.x % blockSize) > blockSize * (1- taux)) ) {
            valx ++;
        } 
        if ( (point.x >  midx) && (Math.abs(point.x % blockSize) < blockSize * taux) ) {
            valx --;
        } 
        if ( (point.y <  midy) && (Math.abs(point.y % blockSize) > blockSize * (1- taux)) ) {
            valy ++;
        } 
        if ( (point.y >  midy) && (Math.abs(point.y % blockSize) < blockSize * taux) ) {
            valy --;
        } 

        var block = {
            x: valx,
            y: valy
        };
//        console.log("Point : " + point.x + "," + point.y);
//        console.log("Block : " + valx + "," + valy);
        blocks.push(block);
    }
    // parcours des blocs de la liste pour compléter les blocs manquants
    var blocksFull = [];
    var lastBlock = blocks[0];
    blocksFull.push(lastBlock);
    for (var i = 1; i < blocks.length+1; i++) {
//        console.log("Last block : " + lastBlock.x + "," + lastBlock.y);
        var block = blocks[i%blocks.length];
        // si les blocs sont identiques, rien à faire
        if (block.x === lastBlock.x && block.y === lastBlock.y) {
//            console.log("same block : " + block.x + "," + block.y);
            continue;
        }
        // si mes blocs sont contigus, ok 
        if ((block.x === lastBlock.x && (block.y === lastBlock.y + 1 || block.y === lastBlock.y - 1)) || (block.y === lastBlock.y && (block.x === lastBlock.x + 1 || block.x === lastBlock.x - 1))) {
            lastBlock = block;
 //           console.log("contigue block : " + block.x + "," + block.y);
            blocksFull.push(block);
        } else {
//            console.log("Blocs non contigus : " + lastBlock.x + "," + lastBlock.y + " et " + block.x + "," + block.y);
           // compléter les blocs manquants
            segment = calcStraightLine(lastBlock, block);
  //          console.log("Segment : " + segment.length + " points");
            segment.forEach(function(coordinates) {
               blocksFull.push(coordinates);
            });
            blocksFull.push(block);
            lastBlock = block;
        }
    }
    return blocksFull;
}


/**********************************************************************
 *  Create map from garden and blocklist
 */
function createMap(garden, blocks) {
    var sizeX = Math.floor(garden.bounds.maxX / 10) - Math.floor(garden.bounds.minX / 10) + 1;
    var sizeY = Math.floor(garden.bounds.maxY / 10) - Math.floor(garden.bounds.minY / 10) + 1;

    var minX = Math.floor(garden.bounds.minX / 10);
    var minY = Math.floor(garden.bounds.minY / 10);

    var map = [];

    for (var i = 0; i < sizeX; i++) {
        map[i] = []; 
        for (var j = 0; j < sizeY; j++) {
            map[i][j] = 0; // 0 pour les cases vides
        }
    }

    // mets 1 sur tous les bords de la carte
    blocks.forEach(function(block) {
        map[block.x - minX][block.y - minY] = 1; // 1 pour les cases occupées
    });


    // mets 2 sur tous les points qui ne sont pas dans la carte
    // parcours toutes les colonnes horizontale pour déterminer les blocs qui sont sur les bords de la carte
    for (var i = 0; i < sizeX; i++) {
        // rechreche les premiers blocs
        var p = 0;
        while (p < sizeY ) {
            if (map[i][p] === 1) {
                break;
            }
            map[i][p] = 2; // 2 pour les cases hors carte
            p++;
        }
        p =  sizeY-1
        while (p > 0) {
            if (map[i][p] === 1) {
                break;
            }
            map[i][p] = 2; // 2 pour les cases hors carte
            p--;
        }
    }

    for (var i = 0; i < sizeY; i++) {
        // rechreche les premiers blocs
        var p = 0;
        while (p < sizeX ) {
            if (map[p][i] === 1) {
                break;
            }
            map[p][i] = 2; // 2 pour les cases hors carte
            p++;
        }
        p =  sizeX-1
        while (p > 0) {
            if (map[p][i] === 1) {
                break;
            }
            map[p][i] = 2; // 2 pour les cases hors carte
            p--;
        }
    }
 
    // pour chaque obstacle, on rempli de bleus les blocs
    for (var i = 0; i < garden.obstacles.length; i++) {
        var obs = garden.obstacles[i];
        console.log("Obstacles "+i);
        //        console.log("Obstacle "+obs.blocks.length);
        // parcours la liste des blocs et recherche horizontalement des zones
        for (var b = 0; b < obs.blocks.length; b++) {
            var block = obs.blocks[b];
            // Vérifie à droite et à gauche
            var dRight = -1;
            var dLeft = -1;
            for (d = block.x+1- minX; d < map.length-1; d++) { // chaque point de la carte à droite
                // rechercher le bloc sur correspondant à 
                for (bl = 0; bl < obs.blocks.length; bl++) {
                    var autre = obs.blocks[bl];
                    if ((autre.x- minX == d)&&(autre.y == block.y)) {
                        dRight = d;
                        break;
                    } 
                }
                if (dRight != -1) {
                    break;
                }
            }
            for (d = block.x-1- minX; d > 0; d--) {
                // rechercher le bloc sur correspondant à 
                for (bl = 0; bl < obs.blocks.length; bl++) {
                    var autre = obs.blocks[bl];
                    if ((autre.x- minX == d)&&(autre.y == block.y)) {
                        dLeft = d;
                        break;
                    } 
                }
                if (dLeft != -1) {
                    break;
                }
            }
            if (dRight != -1) { // si il existe un block à droite
                console.log("Right "+(block.x+1- minX)+" - "+(dRight-1)+" "+(block.y-minY));
                for (d = block.x+1- minX; d < dRight-1; d++) {
                    map[d][block.y-minY] = 2;
                }
            } else {
                if (dLeft != -1) {
                    console.log("Left "+(block.x-1- minX)+" - "+(dLeft+1)+" "+(block.y-minY));
                    for (d = block.x-1- minX; d > dLeft+1; d--) {
                        map[d][block.y-minY] = 2;
                    }
                }
            }
        }           
    }
    return map;
}


//** retourne le prochain bloc du parcours 
//    si le prochain block est libre, ok
//    sinon, il faut se décaler vers le haut, puis l'autre direction, puis le bas 
function getNextBlock(map, position, target, acceptLimit) {
    /// regarder s'il faut revenir sur la bonne ligne
    var diry = target.y - position.y;
    var dirx = target.x - position.x;

    var limite = 1;
    if (acceptLimit) {
        limite = 2;
    }
    
    var directionX = dirx/Math.abs(dirx);
    var directionY = diry/Math.abs(diry);

    if (dirx == 0) {
        directionX = 0;
    }
    if (diry == 0) {
        directionY = 0;
    }

    if (diry != 0) { // changer de ligne
        var next = {
            x: position.x,
            y: position.y + directionY
        }
        if ((map[next.x][next.y] != limite)&&(map[next.x+directionX][next.y] != limite)) {
            console.log("Change de ligne V : "+position.x+","+position.y+" -> "+next.x+","+next.y);
            return next;
        } 
    } // je ne peux pas changer de ligne, je tente d'avancer

    if (dirx === 0 && diry === 0) {
        console.log("Arrivé");
        return position;
    }
    // evalue si le bloc suivant est libre
    // si ok, on y va et c'est tout

    next = {
        x: position.x+directionX,
        y: position.y
    }; 
    if (map[next.x][next.y] != limite) {
        console.log("Avance : "+position.x+","+position.y+" -> "+next.x+","+next.y);
        return next;
    } else {
        var val = map[next.x][next.y];
        // il faut chercher la direction (haut / bas) la plus proche de la cible
        var nbUp = -1;
        for (var i = position.y+1; i < map[0].length; i++) {
            console.log("Up "+i+" "+(map[position.x][i])+" "+map[position.x+directionX][i]);
            if (map[position.x][i] >= limite) {
                break;
            }
            if (map[position.x+directionX][i] < limite) {
                nbUp = i;
                break;
            }
        } 
        var nbDown = -1;
        var i = 0;
        for (i = position.y-1; i >= 0; i--) {
            console.log("Up "+i+" "+(map[position.x][i])+" "+map[position.x+directionX][i]);
            if (map[position.x][i] >= limite) {
                break;
            }
            if (map[position.x+directionX][i] < limite) {
                nbDown = i;
                break;
            }
        } 

        if (nbUp == -1 && nbDown == -1) {
            console.error("No free block found "+val+" "+(position.y-1));
            throw new Error("No free block found");
        }
        if ((nbUp <= nbDown || nbDown == -1) && nbUp != -1) { // je monte
            next = {
                x: position.x,
                y: position.y+1
            };
            console.log("Change de ligne H : "+position.x+","+position.y+" -> "+next.x+","+next.y);
            return next; 
        }
        if ((nbDown < nbUp || nbUp == -1) && nbDown != -1) { // je monte
            next = {
                    x: position.x,
                    y: position.y-1
            };
            console.log("Change de ligne B : "+position.x+","+position.y+" -> "+next.x+","+next.y);
            return next; 
        }
        console.log("No free block found, but should not happen : "+position.x+","+position.y+" -> "+nbDown+" / "+nbUp);
    }
}

/** identifie la target à partir de la map et la direction */
function getTarget(map, rowID, direction) {
    var i = 0;
    if (direction == 1) {
        for (i= map.length - 1; i >= 0  ; i--) {
            if (map[i][rowID] == 0) { break; }
        }
        if (i <= 0) {
            console.log("No free block found in row "+rowID);
            return null;
        }
    } else {
        for (i= 0; i < map.length; i++) {
            if (map[i][rowID] == 0) { break; }
        }
        if (i == map.length) {
            console.log("No free block found in row "+rowID+" "+map.length);
            return null;
        }
    }
    target = {
        x: i,
        y: rowID
    };
    return target;
}


/** iterations vers la target - retourne une liste de blocks */
function gotoTarget(map, block, target, acceptLimit) {
    path = [];
    var isFinished = false;
    var nb = 0;
    while (!isFinished) {
        var next = getNextBlock (map, block, target, acceptLimit);
        nb ++;
//        console.log("Next : " + next.x + "," + next.y);
        if (nb > 200) {
            console.log("Too many blocks in path, possible infinite loop - "+block.x+","+block.y+" "+target.x+","+target.y);
            throw new Error("Too many blocks in path, possible infinite loop - "+block.x+","+block.y+" "+target.x+","+target.y);
        }
        if (next.x == target.x && next.y == target.y ) {
            isFinished = true;
        } else {            
            if (next.x == block.x && next.y == block.y) {
                console.error("No free block found - same block")
                throw new Error("No free block found - same block");
                isFinished = true;
            }
            path.push(next);
            block = next;
        }
    }
    return path;
}


/** creation de la carte avec les positions 
 *        6 2 7 
 *        1 0 3
 *        5 4 8
 * 
 *    last = path défini actuellement pour ne pas revenir sur ses pas
 */
function getNextLine (map, block, path, limite) {
    var area = [3, 3, 3, 3, 3, 3, 3, 3, 3]; /// liste des points autour de la position actuelle
    // gestion des bords de la carte
    if (block.y < map[0].length) {
        if (block.x > 0) {
            area[6]= map[block.x-1][block.y+1];
        }
        area[2]= map[block.x][block.y+1];
        if (block.x < map.length-1) {
            area[7]= map[block.x+1][block.y+1];
        }
    }
    if (block.x > 0) {
        area[1]= map[block.x-1][block.y];
    }
    area[0]= map[block.x][block.y];
    if (block.x < map.length-1) {
        area[3]= map[block.x+1][block.y];
    }
    if (block.y > 0) {
        if (block.x > 0) {
            area[5]= map[block.x-1][block.y-1];
        }
        area[4]= map[block.x][block.y-1];
        if (block.x < map.length-1) {
            area[8]= map[block.x+1][block.y-1];
        }
    }
    console.log(area[6]+" "+area[2]+" "+area[7]);
    console.log(area[1]+" "+area[0]+" "+area[3]);
    console.log(area[5]+" "+area[4]+" "+area[8]);
    // analyse de la matrix.
    var nextBox = 0;
    // recherche la première boite compatible
    for (i = 0; i < 8; i++) {
        nextBox = i;
//        console.log("Next "+nextBox+" "+area[nextBox]+" "+limite);
        if ((area[nextBox]== limite) ) {  //
//
            var next = null;
            // retourne le noeud associé au chiffre
            if (nextBox == 2) {next = { x: block.x, y: block.y+1};} 
            if (nextBox == 3) {next = { x: block.x+1, y: block.y};} 
            if (nextBox == 4) {next = { x: block.x, y: block.y-1};} 
            if (nextBox == 1) {next = { x: block.x-1, y: block.y};} 
            if (nextBox == 6) {next = { x: block.x-1, y: block.y+1};} 
            if (nextBox == 7) {next = { x: block.x+1, y: block.y+1};}
            if (nextBox == 8) {next = { x: block.x+1, y: block.y-1}; }
            if (nextBox == 5) {next = { x: block.x-1, y: block.y-1};} 
            if (next != null) {
                var deja = false;
                for (var p = 0; (p < 9) && ( p < path.length); p ++) {
                    if ((next.x == path[path.length -1 - p].x) && (next.y == path[path.length -1 - p].y)) {
                        deja = true;
                        console.log("Déjà passé "+nextBox);
                        break;
                    } 
                } 
                if (!deja) {
                    console.log("Choose "+nextBox);
                    return next;
                }
            }
        }
    } 
    //pas trouvé de solution.
    console.error(" Dead end - no solution");
    return null;
}

/*** identifie la route pour suivre un parcours avec les blocs idenitfiés 
 *   sens trigonométrique 
*/
function followTheLine (map, block, limite) {
    var path = [];
    var depart = block;
    console.log("Départ = "+block.x+" "+block.y);
    var next = getNextLine(map, block, path, limite);
    console.log(next);
    block = next;
    path.push(block);
    var ok = (block.x == depart.x) && (block.y == depart.y);
    var nb = 0;
    while (!ok) {
        next = getNextLine(map, block, path, limite);
        block = next;
        if (block == null) {
            break;
        }
        path.push(block);
        console.log("Block = "+block.x+" "+block.y);
        ok = (block.x == depart.x) && (block.y == depart.y);
        if (nb > 2000) {
            console.log("On boucle ! "+depart.x+" "+depart.y); 
            return path; 
        }
        nb ++;
    }
    return path;
}



/*** on regarde la distance la plus courte entre le point et le bord de la carte */
function getDirContours(map, position) {
    var dNord = position.y;
    var dSud = map[0].length - position.y;
    var dOuest = position.x;
    var dEst = map.length - position.x;

    var min = Math.min(dNord, dSud, dOuest, dEst);
    if (min == dNord) {
        // détermine le premier point libre sur la colonne
        var i = 0;
        for (i= 0; i < map[0].length; i++) {
            if (map[position.x][i] == 1) { break; }
        }
        return {
            x: position.x,
            y: 1
        };
    }
    if (min == dSud) {
        var i = map[0].length-1;
        for (i= map[0].length-1; i <= 0; i--) {
            if (map[position.x][i] == 1) { break; }
        }
        return {
            x: position.x,
            y: i
        };
    }
    if (min == dOuest) {
        var i = 0;
        for (i= 0; i < map.length; i++) {
            if (map[i][position.y] == 1) { break; }
        }
        return {
            x: i,
            y: position.y
        };
    }
    if (min == dEst) {
        var i = map.length-1;
        for (i= map.length-1; i >= 0; i--) {
            if (map[i][position.y] == 1) { break; }
        }
        return {
            x: i,
            y: position.y
        };
    }
}

/* construit la liste des blocks correspondant au parcours de la tondeuse   */
function createPath(garden) {
    var path = [];
    map = garden.map;
    var minx = Math.floor(garden.bounds.minX/blockSize);
    var miny = Math.floor(garden.bounds.minY/blockSize);
    var nbRows = Math.floor(garden.bounds.maxY/blockSize) - Math.floor(garden.bounds.minY/blockSize);

    var myX = (garden.departure.x/blockSize)-minx;
    var myY = (garden.departure.y/blockSize)+miny;
    var depart = {
            x: myX,
            y: myY
    };

    // faire le tour des limites du jardin en premier
    // identifier le point de ralliment du contours
    var block = depart;
    var roundTarget = getDirContours(map, depart);
    console.log("Round departure : " + block.x + "," + block.y);
    console.log("Round target : " + roundTarget.x + "," + roundTarget.y);
    path = gotoTarget(map, block, roundTarget, true);
    path.push(roundTarget);
    // add the hedge of the path - sens des aiguille d'une montre
    block = roundTarget;
    var linePath = followTheLine(map, roundTarget, 1);
    block = linePath[linePath.length -1];
    path = path.concat(linePath);
    
    /// faire le tour des obstacles
    for (var i = 0; i < garden.obstacles.length; i ++) {
        console.log("OBS departure : " + block.x + "," + block.y);
        var obstacle = garden.obstacles[i];
        var pt = getBlock(garden, obstacle.points[0]);
        console.log("OBS target : " + pt.x + "," + pt.y);
        try {
            var obsPath = gotoTarget(map, block, pt, true);
            obsPath.push(pt);
            block = pt;
            path = path.concat(obsPath);
            var linePath = followTheLine(map, block, 1);
            console.log("OBS target 2 : " + block.x + "," + block.y);
            block = linePath[linePath.length -1];
            path = path.concat(linePath);
        } catch (error) {
            console.log(error.message);
            return path;
        }
    }


    block = path[path.length -1];

    try {
        console.log("Start mowing the grass");
        var direction = -1; // 1 pour droite, -1 pour gauche
        var rowID = 0;
        var first = false
        for (var id = 0; id < nbRows; id++) {
            rowID = id;
            console.log("Row "+rowID+"/"+nbRows);
            console.log("Depart "+block.x+","+block.y);
            direction = direction * -1;
            var target= getTarget(map, rowID, direction);
            if (target != null) {
                if (!first) {
                    console.log("Target : " + target.x + ", " + target.y);
                    var rowPath = gotoTarget(map, block, target, false);
                    path = path.concat(rowPath);
                    block = target;
                    first = true;
                    direction = direction * -1;
                    target= getTarget(map, rowID, direction);
                    if (target == null) {
                        continue;
                    }
                }
                console.log("Target : " + target.x + ", " + target.y);
                var rowPath = gotoTarget(map, block, target, false);
                path = path.concat(rowPath);
                block = target;
            }
        }
    } catch (err) {
        console.log(err.message);
        return path;
    }
    return path;
}



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
/** Calcul des zones */ 
var bounds = getBounds(garden);
console.log(bounds);
for (var i = 0; i < garden.obstacles.length; i++) {
    var obstacle = garden.obstacles[i];
    var obstacleBounds = getBounds(obstacle);
    garden.obstacles[i].bounds = obstacleBounds;
}

var lst = createBlocks(garden);
for (var i = 0; i < garden.obstacles.length; i++) {
    var obstacle = garden.obstacles[i];
    var obstacleBlocks = createBlocks(obstacle);
    console.log("Obstacle "+i+" : "+obstacleBlocks.length+" blocks");
    obstacle.blocks = obstacleBlocks;
    lst = lst.concat(obstacleBlocks);
    garden.obstacles[i].blocks = obstacleBlocks;
}
var map = createMap(garden, lst);
garden.map = map;
fs.writeFileSync('screen/garden.json', JSON.stringify(garden));


var path = createPath(garden);
var pathCoordinates = {};
pathCoordinates.blockPath = path;
fs.writeFileSync('screen/path.json', JSON.stringify(pathCoordinates));
console.log("Nombre de blocs pour le path : "+path.length);