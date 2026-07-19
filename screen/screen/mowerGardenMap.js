// permet de gerer la carte de jardin

const fs = require('fs');


const GRASS = 0;
const LIMIT = 1;
const DEAD_END = 2;
const OUT_OF_BOUNDS = 3;
const OUT_OF_MAPS= 4;

const NORTH = 0;
const EAST = 1; 
const SOUTH = 2;
const WEST = 3;

/***Module to manage the map */
module.exports = {

/** Variable globale - jardin général */
   blockSize : 10,
   mowerDirection : NORTH,

//** calcule la boite englobante du jardin / obstacle*/
    getBounds : function  (map) {
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
    },

/******************************************************************************************************
 * calcule les coordonnées d'une ligne droite entre deux points (x1, y1) et (x2, y2) en utilisant l'algorithme de Bresenham
 */
    calcStraightLine : function (startCoordinates, endCoordinates) {
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
    },

    /******************************************************************
     * recherche les voies sans issues - points ou il y a uniquement 1 seule voie accessible 
     * dead ends are marked with DEAD_END in the map
     * When a dead end appends, it is autorized to go back to the previous block, but not to go forward
    */
    identifyDeadEnds : function (map) {
        // pour chaque élément de la carte, identifie si il a des paternes de dead end
        for (var x = 0; x < map.length; x++) {
            for (var y = 1; y < map[0].length-1; y++) {   
                if ((map[x][y-1] > LIMIT) && (map[x][y] == LIMIT) && (map[x][y+1] > LIMIT) ) {
                    console.log("Dead end "+x+", "+y+" "+map[x][y-1]+" "+map[x][y]+" "+map[x][y+1]);
                    map[x][y] = DEAD_END;
                }
            }
        }
        for (var y = 0; y < map[0].length; y++) {   
            for (var x = 1; x < map.length-1; x++) {
                if ((map[x-1][y] > LIMIT) && (map[x][y] == LIMIT) && (map[x+1][y] > LIMIT) ) {
                    console.log("Dead end "+x+", "+y+" "+map[x-1][y]+" "+map[x][y]+" "+map[x+1][y]);
                    map[x][y] = DEAD_END;
                }
            }
        }
    },

/**********************************************************************
 *  cree une grille de blocs à partir du jardin et des obstacles
 *      gestion de la position du point dans le bloc.
 **********************/
    createBlocks : function(map) {
        // simplification de la carte sous la forme de liste de blocs
        var blocks = [];
        if (map.bounds === undefined) {
            map.bounds = this.getBounds(map);
        }
        var midx = map.bounds.minX + (map.bounds.maxX - map.bounds.minX)/2;
        var midy = map.bounds.minY + (map.bounds.maxY - map.bounds.minY)/2;
        console.log("Mid : " + midx + "," + midy+ " - "+map.points.length);
        // itère sur les points du jardin
        for (var i = 0;  i < map.points.length; i++ ) {
            var point = map.points[i];
            console.log("Point : " + point.x + "," + point.y);
            if ((point.x === undefined) || (point.y === undefined )) {
                continue;
            }
            // Gestion d'une tollérence. Si le point est proche du bord d'un bloc, on considère qu'il appartient au bloc voisin
            var taux = 0.1;
            var valx= Math.floor(point.x / this.blockSize);
            var valy= Math.floor(point.y / this.blockSize);
            // la tollérence s'applique sur les bords dans le sens de l'intérieur du jardin
            if ( (point.x <  midx) && (Math.abs(point.x % this.blockSize) > this.blockSize * (1- taux)) ) {
                valx ++;
            } 
            if ( (point.x >  midx) && (Math.abs(point.x % this.blockSize) < this.blockSize * taux) ) {
                valx --;
            } 
            if ( (point.y <  midy) && (Math.abs(point.y % this.blockSize) > this.blockSize * (1- taux)) ) {
                valy ++;
            } 
            if ( (point.y >  midy) && (Math.abs(point.y % this.blockSize) < this.blockSize * taux) ) {
                valy --;
            } 

            var block = {x: valx, y: valy};
    //        console.log("Point : " + point.x + "," + point.y);
            console.log("Block : " + valx + "," + valy);
            blocks.push(block);
        }
        // parcours des blocs de la liste pour compléter les blocs manquants
        var blocksFull = [];
        var lastBlock = blocks[0];

        blocksFull.push(lastBlock);
        for (var i = 1; i < blocks.length+1; i++) {
            console.log("Last block : "+i+" "+ lastBlock.x + "," + lastBlock.y);
            var block = blocks[i%blocks.length];
            console.log("Block : "+i+" "+ block.x + "," + block.y);
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
                console.log("Blocs non contigus : " + lastBlock.x + "," + lastBlock.y + " et " + block.x + "," + block.y);
            // compléter les blocs manquants
                segment = this.calcStraightLine(lastBlock, block);
                console.log("Segment : " + segment.length + " points");
                segment.forEach(function(coordinates) {
                    blocksFull.push(coordinates);
                });
                blocksFull.push(block);
                lastBlock = block;
            }
        }
        console.log("End of create blocks");
        return blocksFull;
    },


/**********************************************************************
 *  Create map from garden and blocklist
 */
    createMap : function (garden, blocks) {
        var sizeX = Math.floor(garden.bounds.maxX / 10) - Math.floor(garden.bounds.minX / 10) + 1;
        var sizeY = Math.floor(garden.bounds.maxY / 10) - Math.floor(garden.bounds.minY / 10) + 1;

        var minX = Math.floor(garden.bounds.minX / 10);
        var minY = Math.floor(garden.bounds.minY / 10);

        var map = [];

        for (var i = 0; i < sizeX; i++) {
            map[i] = []; 
            for (var j = 0; j < sizeY; j++) {
                map[i][j] = GRASS; // 0 pour les cases vides
            }
        }

        // mets 1 sur tous les bords de la carte
        blocks.forEach(function(block) {
            map[block.x - minX][block.y - minY] = LIMIT; // 1 pour les cases occupées
        });


        // mets 2 sur tous les points qui ne sont pas dans la carte
        // parcours toutes les colonnes horizontale pour déterminer les blocs qui sont sur les bords de la carte
        for (var i = 0; i < sizeX; i++) {
            // rechreche les premiers blocs
            var p = 0;
            while (p < sizeY ) {
                if (map[i][p] === LIMIT) {
                    break;
                }
                map[i][p] = OUT_OF_BOUNDS; // 2 pour les cases hors carte
                p++;
            }
            p =  sizeY-1
            while (p > 0) {
                if (map[i][p] === LIMIT) {
                    break;
                }
                map[i][p] = OUT_OF_BOUNDS; // 2 pour les cases hors carte
                p--;
            }
        }

        for (var i = 0; i < sizeY; i++) {
            // rechreche les premiers blocs
            var p = 0;
            while (p < sizeX ) {
                if (map[p][i] === LIMIT) {
                    break;
                }
                map[p][i] = OUT_OF_BOUNDS; // 2 pour les cases hors carte
                p++;
            }
            p =  sizeX-1
            while (p > 0) {
                if (map[p][i] === LIMIT) {
                    break;
                }
                map[p][i] = OUT_OF_BOUNDS; // 2 pour les cases hors carte
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
                        map[d][block.y-minY] = OUT_OF_BOUNDS;
                    }
                } else {
                    if (dLeft != -1) {
                        console.log("Left "+(block.x-1- minX)+" - "+(dLeft+1)+" "+(block.y-minY));
                        for (d = block.x-1- minX; d > dLeft+1; d--) {
                            map[d][block.y-minY] = OUT_OF_BOUNDS;
                        }
                    }
                }
            }           
        }
        this.identifyDeadEnds(map);
        return map;
    },

    getBlock : function (garden, map, point) {
        var midx = map.bounds.minX + (map.bounds.maxX - map.bounds.minX)/2;
        var midy = map.bounds.minY + (map.bounds.maxY - map.bounds.minY)/2;
        var minX = Math.floor(garden.bounds.minX / this.blockSize);
        var minY = Math.floor(garden.bounds.minY / this.blockSize);
        var taux = 0.1;
        var valx= Math.floor(point.x / this.blockSize);
        var valy= Math.floor(point.y / this.blockSize);
        // la tollérence s'applique sur les bords dans le sens de l'intérieur du jardin
        if ( (point.x <  midx) && (Math.abs(point.x % this.blockSize) > this.blockSize * (1- taux)) ) {
            valx ++;
        } 
        if ( (point.x >  midx) && (Math.abs(point.x % this.blockSize) < this.blockSize * taux) ) {
            valx --;
        } 
        if ( (point.y <  midy) && (Math.abs(point.y % this.blockSize) > this.blockSize * (1- taux)) ) {
            valy ++;
        } 
        if ( (point.y >  midy) && (Math.abs(point.y % this.blockSize) < this.blockSize * taux) ) {
                valy --;
        } 
        var block = {
            x: valx - minX,
            y: valy - minY
        };
        return block;
    },

//** retourne le prochain bloc du parcours 
//    si le prochain block est libre, ok
//    sinon, il faut se décaler vers le haut, puis l'autre direction, puis le bas 
    getNextBlock : function(map, position, target, acceptLimit) {
        /// regarder s'il faut revenir sur la bonne ligne
        var diry = target.y - position.y;
        var dirx = target.x - position.x;

        var limite = LIMIT; 
        if (acceptLimit) {
            limite = OUT_OF_BOUNDS;
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
    },

        /** identifie la target à partir de la map et la direction */
    getTarget : function(map, rowID, direction) {
        var i = 0;
        if (direction == 1) {
            for (i= map.length - 1; i >= 0  ; i--) {
                if (map[i][rowID] == GRASS) { break; }
            }
            if (i <= 0) {
                console.log("No free block found in row "+rowID);
                return null;
            }
        } else {
            for (i= 0; i < map.length; i++) {
                if (map[i][rowID] == GRASS) { break; }
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
    },


    /** iterations vers la target - retourne une liste de blocks */
    gotoTarget : function(map, block, target, acceptLimit) {
        path = [];
        var isFinished = false;
        while (!isFinished) {
            var next = this.getNextBlock (map, block, target, acceptLimit);
            console.log("Next : " + next.x + "," + next.y);
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
    },


    /** creation de la carte avec les positions 
     *        6 2 7 
     *        1 0 3
     *        5 4 8
     * 
     *    last = path défini actuellement pour ne pas revenir sur ses pas
     */
    getNextLine : function (map, block, path, direction) {
        var area = [{value: OUT_OF_MAPS}, {value: OUT_OF_MAPS}, {value: OUT_OF_MAPS}, 
            {value: OUT_OF_MAPS}, {value: OUT_OF_MAPS}, {value: OUT_OF_MAPS}, 
            {value: OUT_OF_MAPS}, {value: OUT_OF_MAPS}, {value: OUT_OF_MAPS}]; /// liste des points autour de la position actuelle
        // gestion des bords de la carte
        if (block.y < map[0].length-1) {
            if (block.x > 0) {
                area[3].value= map[block.x-1][block.y+1];
                area[3].x = block.x-1;
                area[3].y = block.y+1;
            }
            area[2].value= map[block.x][block.y+1];
            area[2].x = block.x;
            area[2].y = block.y+1;
            if (block.x < map.length-1) {
                area[4].value= map[block.x+1][block.y+1];
                area[4].x = block.x+1;
                area[4].y = block.y+1;      
            }
        }
        if (block.x > 0) {
            area[1].value= map[block.x-1][block.y];
            area[1].x = block.x-1;
            area[1].y = block.y;
        }
        area[0].value= map[block.x][block.y];
        area[0].x = block.x;
        area[0].y = block.y;
        if (block.x < map.length-1) {
            area[6].value= map[block.x+1][block.y];
            area[6].x = block.x+1;
            area[6].y = block.y;
        }
        if (block.y > 0) {
            if (block.x > 0) {
                area[5].value= map[block.x-1][block.y-1];
                area[5].x = block.x-1;
                area[5].y = block.y-1;
            }
            area[7].value= map[block.x][block.y-1];
            area[7].x = block.x;
            area[7].y = block.y-1;
            if (block.x < map.length-1) {
                area[8].value= map[block.x+1][block.y-1];
                area[8].x = block.x+1;
                area[8].y = block.y-1;
            }
        }
        // gestion de la rotaion de la matrix en fonction de la direction du robot
        if (direction == WEST) {
            area = [area[0], area[7], area[1], area[5], area[3], area[8], area[2], area[6], area[4]];
        } else if (direction == SOUTH) {
            area = [area[0], area[6], area[7], area[8], area[5], area[4], area[1], area[2], area[3]];
        } else if (direction == EAST) {
            area = [area[0], area[2], area[6], area[4], area[8], area[3], area[7], area[1], area[5]];
        }
        console.log(area[3].value+" "+area[2].value+" "+area[4].value);  //324
        console.log(area[1].value+" "+area[0].value+" "+area[6].value);  //106
        console.log(area[5].value+" "+area[7].value+" "+area[8].value);  //578
        // analyse de la matrix.
        var nextBox = 0;
        // recherche la première boite compatible
        for (i = 1; i < 8; i++) {
            nextBox = i;
    //        console.log("Next "+nextBox+" "+area[nextBox]+" "+limite);
            if ( (area[nextBox].value == LIMIT) || (area[nextBox].value == DEAD_END) ) {  //
                var next = null;
                next ={ x: area[nextBox].x, y: area[nextBox].y };
                var deja = 0;
                for (var p = 1; (p < 10) && ( p < path.length); p ++) {
                    if ((next.x == path[path.length -1 - p].x) && (next.y == path[path.length -1 - p].y)) {
                        deja ++;
                        console.log("Déjà passé "+nextBox+" "+area[nextBox].value+" "+deja);
                    } 
                } 
                if (deja == 0) {
                    if (nextBox == 6) {
                        this.mowerDirection = (this.mowerDirection+1) % 4;
                    }
                    if (nextBox == 5 || nextBox == 7 || nextBox == 8) {
                        this.mowerDirection = (this.mowerDirection+2) % 4;
                        console.log("tourne "+this.mowerDirection);
                    }
                    if (nextBox == 1) {
                        this.mowerDirection = (this.mowerDirection+3) % 4;
                        console.log("tourne "+this.mowerDirection);
                    }
                    console.log("Choose "+nextBox+" "+area[nextBox].value+" "+area[nextBox].x+" "+area[nextBox].y+" dir = "+this.mowerDirection);
                    next.direction = this.mowerDirection; 
                    return next;
                } else {
                    if ( (area[nextBox].value == DEAD_END) && (deja == 1) ) {
                        if (nextBox == 6) {
                            this.mowerDirection = (this.mowerDirection+1) % 4;
                        }
                        if (nextBox == 5 || nextBox == 7 || nextBox == 8) {
                            this.mowerDirection = (this.mowerDirection+2) % 4;
                            console.log("tourne "+this.mowerDirection);
                        }
                        if (nextBox == 1) {
                            this.mowerDirection = (this.mowerDirection+3) % 4;
                            console.log("tourne "+this.mowerDirection);
                        }
                        console.log("Choose repasse "+nextBox+" "+area[nextBox].value+" "+area[nextBox].x+" "+area[nextBox].y+" dir = "+this.mowerDirection);
                        next.direction = this.mowerDirection; 
                        return next;
                    }
                }
            }
        } 
        //pas trouvé de solution.
        console.error(" Dead end - no solution");
        return null;
    },

    /*** identifie la route pour suivre un parcours avec les blocs idenitfiés 
     *   sens trigonométrique 
    */
    followTheLine : function (map, block, limite) {
        var path = [];
        var depart = block;
        this.mowerDirection = NORTH;
        console.log("Départ = "+block.x+" "+block.y);
        var next = this.getNextLine(map, block, path, this.mowerDirection);
        if (next == null) {
            console.error("No next block found");
            return path;
        }
        console.log(next);
        block = next;
        path.push(block);
        var ok = (block.x == depart.x) && (block.y == depart.y);
        var nb = 0;
        while (!ok) {
            next = this.getNextLine(map, block, path, this.mowerDirection);
            block = next;
            if (block == null) {
                console.error("No next block found "+path.length);
                break;
            }
            path.push(block);
            console.log("Block = "+block.x+" "+block.y);
            ok = (block.x == depart.x) && (block.y == depart.y);
            if (nb > 2000) {
                console.log("On boucle ! "+depart.x+" "+depart.y+" "+path.length); 
                return path; 
            }
            nb ++;
        }
        return path;
    },


    /*** on regarde la distance la plus courte entre le point et le bord de la carte */
    getDirContours : function(map, position) {
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
    },

    // renvoie un tableau de missions correspondant au parcours de la tondeuse
    getMissions : function(garden, map, blocks) {
        var missions = [];

        var minx = Math.floor(garden.bounds.minX/this.blockSize);
        var miny = Math.floor(garden.bounds.minY/this.blockSize);
        var nbRows = Math.floor(garden.bounds.maxY/this.blockSize) - Math.floor(garden.bounds.minY/this.blockSize);

        console.log("Min : " + minx + "," + miny);
        console.log("departure : " + garden.departure.x + "," + garden.departure.y);

        var myX = (garden.departure.x/this.blockSize)-minx;
        var myY = (garden.departure.y/this.blockSize)-miny;
        var depart = {
                x: myX,
                y: myY
        };
        missions[0] = {
            name : "Go to the first limit",
            type: "gotoTarget",
            destination : this.getDirContours(map, depart),
            withLine : true,
            isFinished : false
        }
        missions[1] = {
            name : "Mowe around the garden limit",
            type: "followTheLine",
            departure: missions[0].destination,
            isFinished : false
        }
        /// faire le tour des obstacles
        var last = missions[0].destination;
        for (var i = 0; i < garden.obstacles.length; i ++) {
            var obstacle = garden.obstacles[i];
            var pt = this.getBlock(garden, garden, obstacle.points[0]);
            missions[2+i*2] = {
                name : "Go to the "+ obstacle.name +" limit",
                type: "gotoTarget",
                destination : pt,
                withLine : true,
                isFinished : false
            }
            last = pt;
            missions[2+i*2+1] = {
                name : "Mowe around the"+ obstacle.name +" limit",
                type: "followTheLine",
                departure: pt,
                isFinished : false
            }
        }
        var indice = 2 + garden.obstacles.length * 2;
        var direction = -1; // 1 pour droite, -1 pour gauche
        var rowID = 0;
        var first = false
        for (var id = 0; id < nbRows; id++) {
            rowID = id;
            direction = direction * -1;
            var target= this.getTarget(map, rowID, direction);
            if (target != null) {
                if (!first) {
                    missions[indice++] = { // mission pour avancer sur une ligne
                        name : "Mowe the fist row",
                        type: "mowetoTarget",
                        destination : target,
                        withLine : false,
                        isFinished : false
                    }
                    block = target;
                    first = true;
                    direction = direction * -1;
                    target= this.getTarget(map, rowID, direction);
                    if (target == null) {
                        continue;
                    }
                }
                missions[indice++] = { //ission pour avancer sur une ligne
                    name : "Mowe the row "+indice,
                    type: "mowetoTarget",
                    destination : target,
                    withLine : false,
                    isFinished : false
                }
                block = target;
            }
        }
        // retour à la base
        missions[indice++] = { //ission pour avancer sur une ligne
            name: "Back to the base",
            type: "gotoTarget",
            destination : depart,
            withLine : true,
            isFinished : false
        }

        return missions;
    },

    /** sending back the next position  */
    getNextStep : function(map, mission, robotPosition) {
        if (mission.iterations === undefined) {
                mission.iterations = 0;
                mission.path = [];
        }
        mission.iterations ++;
        if (mission.iterations > 200) {
            console.log("Too many blocks in path, possible infinite loop - "+JSON.stringify(mission));
            throw new Error("Too many blocks in path, possible infinite loop - "+JSON.stringify(mission));
        }
        var block = {x: robotPosition.x, y: robotPosition.y};
        if (mission.type == "gotoTarget") {
            var target = mission.destination;
            var next = this.getNextBlock (map, block, target, mission.withLine);
            console.log("Next : " + next.x + "," + next.y);
            if (next.x == target.x && next.y == target.y ) {
                // mission terminée
                mission.isFinished = true;
                console.log("Mission is finished");
                return {position : next, direction : this.mowerDirection};
            } else {            
                if (next.x == block.x && next.y == block.y) {
                    console.log("No free block found - same block")
                    misssion.isFinished = true;
                }
            }
            return {position : next, direction : this.mowerDirection};
        }
        if (mission.type == "followTheLine") {
            mission.iterations ++;
            var depart = mission.departure;
            this.mowerDirection = robotPosition.azimut;
            var next = this.getNextLine(map, block, mission.path, this.mowerDirection);
            if (next == null) {
                console.error("No next block found");
                mission.isFinished = true;
                return null;
            } else {
                mission.path.push(next);
            }
            console.log("Step = "+JSON.stringify(next)+" "+ JSON.stringify(depart));
            if ((next.x == depart.x) && (next.y == depart.y)) {
                // mission terminée
                console.log("Mission is finished");
                mission.isFinished = true;
            }
            return {position : next, direction : this.mowerDirection};
        }
        if (mission.type == "mowetoTarget") {
            var target = mission.destination;
            var next = this.getNextBlock (map, block, target, mission.withLine);
            console.log("Next : " + next.x + "," + next.y);
            if (next.x == target.x && next.y == target.y ) {
                // mission terminée
                console.log("Mission is finished");
                mission.isFinished = true;
                return {position : next, direction : this.mowerDirection};
            } else {            
                if (next.x == block.x && next.y == block.y) {
                    console.error("No free block found - same block")
                    throw new Error("No free block found - same block");
                    misssion.isFinished = true;
                }
            }
            return {position : next, direction : this.mowerDirection};
        }
    },

    /* construit la liste des blocks correspondant au parcours de la tondeuse   */
    createPath : function(garden, map) {
        var path = [];
        var minx = Math.floor(garden.bounds.minX/this.blockSize);
        var miny = Math.floor(garden.bounds.minY/this.blockSize);
        var nbRows = Math.floor(garden.bounds.maxY/this.blockSize) - Math.floor(garden.bounds.minY/this.blockSize);

        console.log("Min : " + minx + "," + miny);
        console.log("departure : " + garden.departure.x + "," + garden.departure.y);

        var myX = (garden.departure.x/this.blockSize)-minx;
        var myY = (garden.departure.y/this.blockSize)-miny;
        var depart = {
                x: myX,
                y: myY
        };

        // faire le tour des limites du jardin en premier
        // identifier le point de ralliment du contours
        var block = depart;
        var roundTarget = this.getDirContours(map, depart);
        console.log("Round departure : " + block.x + "," + block.y);
        console.log("Round target : " + roundTarget.x + "," + roundTarget.y);
        path = this.gotoTarget(map, block, roundTarget, true);
        // add the hedge of the path - sens des aiguille d'une montre
        block = roundTarget;
        var linePath = this.followTheLine(map, roundTarget, DEAD_END);
        block = linePath[linePath.length -1];
        path = path.concat(linePath);
        console.log("Round end : " + path.length);
        
        /// faire le tour des obstacles
        for (var i = 0; i < garden.obstacles.length; i ++) {
            console.log("OBS departure : " + block.x + "," + block.y);
            var obstacle = garden.obstacles[i];
            var pt = this.getBlock(garden, garden, obstacle.points[0]);
            console.log("OBS target : " + pt.x + "," + pt.y);
            try {
                var obsPath = this.gotoTarget(map, block, pt, true);
                obsPath.push(pt);
                block = pt;
                path = path.concat(obsPath);
                var linePath = this.followTheLine(map, block, DEAD_END);
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
                var target= this.getTarget(map, rowID, direction);
                if (target != null) {
                    if (!first) {
                        console.log("Target : " + target.x + ", " + target.y);
                        var rowPath = this.gotoTarget(map, block, target, false);
                        path = path.concat(rowPath);
                        block = target;
                        first = true;
                        direction = direction * -1;
                        target= this.getTarget(map, rowID, direction);
                        if (target == null) {
                            continue;
                        }
                    }
                    console.log("Target : " + target.x + ", " + target.y);
                    var rowPath = this.gotoTarget(map, block, target, false);
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
}
