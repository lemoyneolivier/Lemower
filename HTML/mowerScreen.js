// TODO : Afficher les zones proches de danger
// TODO : vérifier l'algorithme de gestion des cases
// TODO : calculer le taux de tonte

var taux;
var centerX = 0;
var centerY = 0;
const h = 600;
const w = 1200;
const step = 20;
var map;

var mx = 1;

var mowerImg = new Image();
mowerImg.src = 'mower.png';

var traceFileName = "";

var canvas;

/************************************************************************
 * retourne le document XML de structure des KPI
 ************************************************************************/
 function getXMLDocument (fname, req) {
	var xhttp = new XMLHttpRequest();
	xhttp.open('GET', fname, false);
	xhttp.send(req);
	
  	// Place the response in an XML document.
  	var xmlDoc = xhttp.response;
    return JSON.parse(xmlDoc);
}


/************************************************************************
 *   Chargement des données au démarrage
 ************************************************************************/ 
function loadFile() {
   canvas = document.getElementById("dessin");

   console.log ("try");
   map = getXMLDocument("/map", null);

   select = document.getElementById("fileSelect");
   for (i = 0; i < select.length; i++) {
        select.remove(i);
   }
   // ajoute les options de fichier à selectionner
   files = getXMLDocument("/tracefiles", null);
   for (i = 0; i < files.length; i++) {
        if (files[i].endsWith(".txt")) {
            opt = document.createElement("option");
            opt.text = files[i];
            select.add(opt);
        }
   }

   if (canvas == null) {
       alert("Canvas not found");
       return;
   }

   if (!canvas.getContext) {
        alert("Error no context available");
   } else {

        var tx = w/(map.bounds.nb_x);
        var ty = h/(map.bounds.nb_y);

        if (tx > ty) {
            taux = ty;
        } else {
            taux = tx;
        }
        console.log("Taux = "+taux);

        centerX = (w - (map.bounds.nb_x)*taux)/2-map.bounds.min_x*taux;
        centerY = (h - (map.bounds.nb_y)*taux)/2-map.bounds.min_y*taux;

        drawScene(map);

        window.setInterval(drawScene, 20000);
   }
}


function registerCut (x, y, nx, ny, map) {
    startX = Math.floor((x-map.bounds.min_x*20.0)/20.0);    
    startY = Math.floor((y-map.bounds.min_y*20.0)/20.0);
    endX = Math.floor((nx-map.bounds.min_x*20.0)/20.0);    
    endY = Math.floor((ny-map.bounds.min_y*20.0)/20.0);    

    dx = endX - startX;
    dy = endY - startY;

    mx = dx;
    if (dy > dx) { mx = dy;}
    if (mx == 0) return;

    progX = dx / mx;
    progY = dy / mx;

    lastX = startX;
    lastY = startY;
    
    for (i = 0; i <= mx; i++){
        posX = startX + Math.floor(progX*i);
        posY = startY + Math.floor(progY*i);
        console.log("Cut point "+posX+", "+posY);
        map.mower[posX*map.bounds.nb_y+posY] = "1";
    }
}

// Dessine la zone de tonte et le chemin de la tondeuse
function drawScene (){
    var ctx = canvas.getContext('2d');

    map = getXMLDocument("/map", null);

    drawArea(ctx, map);

    var lastAngle = 0.0;

    fname = document.getElementById("fileSelect");
    traceFileName = fname.value;

 //   req =  {options:{filename : traceFileName}};
    if (traceFileName.length == 0) {
        return ; x-map.bounds.min_x*20.0
    }
    var positions = getXMLDocument("/positions?filename="+traceFileName, null);

    ctx.beginPath();
    ctx.strokeStyle = 'rgb(255, 0, 0)';
    ctx.lineWidth = 5;

    for (i = 0; i < map.bounds.nb_x; i ++ ) {
       for (j = 0; j < map.bounds.nb_y; j ++ ) {
           m = map.mower[i, j]= "0";
       }
    }

    ctx.moveTo(getX(0), getY(0));
    var lastX = 0;
    var lastY = 0;

    for (var e = 0; e< positions.posList.length; e++) {
        var elem = positions.posList[e];
        ctx.lineTo(getX(elem.x), getY(elem.y));
        registerCut (lastX, lastY, elem.x, elem.y, map);

        lastX = elem.x;
        lastY = elem.y;
        lastAngle = elem.dir;
    }

    ctx.stroke();


    drawCuttingArea(ctx, map);

    drawMower(ctx, lastX, lastY, lastAngle);
    document.getElementById("position").innerText=Math.floor(lastX);
}


// Dessine la zone de tonte
function drawArea(context, map) {
    context.fillStyle = 'rgb(0, 0, 0)';
    context.fillRect(0, 0, w , h);

    context.fillStyle = 'rgb(10, 100, 10)';
    context.fillRect(getX(map.bounds.min_x*step), getY(map.bounds.min_y*step), map.bounds.nb_x*taux, map.bounds.nb_y*taux);

    context.fillStyle = 'rgb(100, 100, 80)';
    for (i = 0; i < map.bounds.nb_x; i ++ ) {
        for (j = 0; j < map.bounds.nb_y; j ++ ) {
            p = map.cost[i*map.bounds.nb_y+j];
            if (p == "1") {
                context.fillStyle = 'rgb(100, 100, 80)';
                mx = (i+map.bounds.min_x)*step;
                my = (j+map.bounds.min_y)*step;
                context.fillRect(getX(mx), getY(my), taux, taux);
            } 
        }
    }
}

// Dessine la zone de tonte
function drawCuttingArea(context, map) {
    context.fillStyle = 'rgb(57, 0, 200)';
    for (i = 0; i < map.bounds.nb_x; i ++ ) {
        for (j = 0; j < map.bounds.nb_y; j ++ ) {
            m = map.mower[i*map.bounds.nb_y+j];
            if (m == "1") {
                mx = (i+map.bounds.min_x)*step;
                my = (j+map.bounds.min_y)*step;
                console.log("Cutted area "+i+" "+j);
                context.fillRect(getX(mx), getY(my), taux, taux);
            }
        }
    }


}


function drawMower (context, x, y, angle) {
   context.save();

   // move to the center of the canvas
   context.translate(getX(x)-12, getY(y));

   // rotate the canvas to the specified degrees
   context.rotate((angle-90.0)*Math.PI/180.0);

   // draw the image
   // since the context is rotated, the image will be rotated also
   context.drawImage(mowerImg, 0, 0, mowerImg.width, mowerImg.height, 0, 0, 25, 30);
   console.log("Mower position : "+getX(x)+", "+getY(y));

   // we’re done with the rotating so restore the unrotated context
   context.restore();
}

function getX(x) {
    return (x/step)*taux+centerX;
}

function getY(y) {
    return (y/step)*taux+centerY;  
}
