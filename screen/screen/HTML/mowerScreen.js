var area = {minX : 0, maxX : 20, minY : -3, maxY : 3};
var taux;
var centerX = 0;
var centerY = 0;
var h = 600;
var w = 1200;

var mx = 1;

var mowerImg = new Image();
mowerImg.src = 'mower.png';

var canvas;
var selectedId=-1;

var mowerPath = [];
var pathIndex = 0;

var gardenMap;
var garden;

var obectId = -1;
var objectName = "Garden";
var nbPoints = 0;
var position = "0, 0";
var recordPath = false;

var connexionStatus = false;

function getXMLDocument (fname, data) {
	var xhttp = new XMLHttpRequest();
    if (data == null) {
        xhttp.open('GET', fname, false);
        xhttp.send(null);
    } else {
        xhttp.open('POST', fname, false);
        xhttp.send(JSON.stringify(data));
    }
        
    // Place the response in an XML document.
    var xmlDoc = xhttp.response;
    return JSON.parse(xmlDoc);
}


/************************************************************************
 *   Chargement des données au démarrage
 ************************************************************************/ 
function loadFile() {
   canvas = document.getElementById("dessin");

   getPorts();
   var usb = document.getElementById("usb");
   if (usb.options.length == 1) {
        usb.value = usb.options[0].value;
        openConnexion();
   }


   if (connexionStatus == false) {
        var tble = document.getElementById("Obstacles"); 
        tble.style.visibility = "hidden";
        var row = document.getElementById("add"); 
        row.style.visibility = "hidden";
  } else { // tableau de description de la connexion 
        var row = document.getElementById("portRow"); 
        row.style.visibility = "hidden";
        row = document.getElementById("baudRateRow"); 
        row.style.visibility = "hidden";
        var tble = document.getElementById("Obstacles"); 
        tble.style.visibility = "visible";
        row = document.getElementById("add"); 
        row.style.visibility = "visible";
   }

   garden = getXMLDocument("/garden", null);
   area = getBounds(garden);
   // mettre à jour la table des obstacles en fonction du jardin
   for (var i = 0; i < garden.obstacles.length; i++) {
        var obs = garden.obstacles[i];
        addObstacle(obs.name);
   }  

   var tPath = getXMLDocument("/path", null);
   path = tPath.blockPath;

    var tMap = getXMLDocument("/map", null);
    gardenMap = tMap.map;


   if (canvas == null) {
       alert("Canvas not found");
       return;
   }

   if (!canvas.getContext) {
        alert("Error no context available");
   } else {
        var tx = w/(area.maxX - area.minX)*0.98;
        var ty = h/(area.maxY - area.minY)*0.98;

        if (tx > ty) {
            taux = ty;
        } else {
            taux = tx;
        }

        centerX = (w - (area.maxX - area.minX)*taux)/2-area.minX*taux;
        centerY = (h - (area.maxY - area.minY)*taux)/2+area.maxY*taux; 
        drawScene();
        window.setInterval(drawPath, 20);
   }
}


function getBounds (map) {
    var points = map.points;
    var bounds = {};
    bounds.minX = points[0].x;
    bounds.maxX = points[0].x;
    bounds.minY = points[0].y;
    bounds.maxY = points[0].y; 
    for (var i = 1; i < points.length; i++) {
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
    return bounds;
}



/** Récupère la liste des ports ouverts pour la communication */
function getPorts() {
    var select = document.getElementById("usb"); 
    var list = getXMLDocument("/ports");
    // POur chaque ligne 
    for (i = 0; i < list.ports.length; i++) {
        var port = list.ports[i];
        var option = document.createElement("option");
        option.value= port;
        option.text= port;
        select.add(option);
   }
}

/**************************************
 *  Pushing the button to connexion   *|
 * ************************************/
function openConnexion() {
    if (connexionStatus == false ) {
        var usb = document.getElementById("usb").value;
        var rate = document.getElementById("baudrate").value;

        var cnx = getXMLDocument("/connexion", {port: usb, baudRate: rate});
    }
}

function showConnexion () {
    var status = getXMLDocument("/status");

    if (status.connexion == "Ready") {
                // change l'image de connexion 
        var row = document.getElementById("portRow"); 
        row.style.visibility = "hidden";
        row = document.getElementById("baudRateRow"); 
        row.style.visibility = "hidden";
        var tble = document.getElementById("Obstacles"); 
        tble.style.visibility = "visible";
        row = document.getElementById("add"); 
        row.style.visibility = "visible";
        // change l'image de connexion 
        var img = document.getElementById("cnxStatus");
        img.src = "connexionOn.png";
        img = document.getElementById("cnxButton");
        img.src = "close.png";
    } 
    if (status.connexion == "Connecting") {
        connexionStatus = false;
        var row = document.getElementById("portRow"); 
        row.style.visibility = "visible";
        row = document.getElementById("baudRateRow"); 
        row.style.visibility = "visible";
        var tble = document.getElementById("Obstacles"); 
        tble.style.visibility = "hidden";
        row = document.getElementById("add"); 
        row.style.visibility = "hidden";
        // change l'image de connexion 
        var img = document.getElementById("cnxStatus");
        img.src = "connexionWait.png";
        img = document.getElementById("cnxButton");
        img.src = "open.png";
    }
    if (status.connexion == "Not") {
        connexionStatus = false;
        var row = document.getElementById("portRow"); 
        row.style.visibility = "visible";
        row = document.getElementById("baudRateRow"); 
        row.style.visibility = "visible";
        var tble = document.getElementById("Obstacles"); 
        tble.style.visibility = "hidden";
        row = document.getElementById("add"); 
        row.style.visibility = "hidden";
        // change l'image de connexion 
        var img = document.getElementById("cnxStatus");
        img.src = "connexionOff.png";
        img = document.getElementById("cnxButton");
        img.src = "open.png";
    }
}


/*** recalcul de la MAP  */
function endRecording () {

    var tble = document.getElementById("recording");
    tble.style.display = "none";

    tble = document.getElementById("settings");
    tble.style.display = "block";

}

function loadRecording(objectName) { 

    var tble = document.getElementById("recording");
    tble.style.display = "block";

    tble = document.getElementById("settings");
    tble.style.display = "none";

    if (objectName === "garden") {
        nbPoints = garden.points.length;
    } else {
        for (var i = 0; i < garden.obstacles.length; i++) {
            var obs = garden.obstacles[i];
            if (obs.name == objectName) {
                nbPoints = obs.points.length;
            }
        }
    }
    var pos = getXMLDocument("/position", null);

    updatePoints();

    var name = document.getElementById("objName");
    name.innerText = objectName;
}

    

// Dessine la zone de tonte et le chemin de la tondeuse
function drawScene (){
    var ctx = canvas.getContext('2d');
    drawArea(ctx);
}

/**************************************
 *  change la sélection de l'obstacle 
 * */
function selectObs (val) {
   if (selectedId != -1) {
       var row = document.getElementById("RowObstacle"+(selectedId+2));
       row.setAttribute("bgcolor", "#FFFFFF");
   }
   if (val == -1) {
    selectedId = -1;
   } else {
        selectedId = val-2;
        var row = document.getElementById("RowObstacle"+val);
        row.setAttribute("bgcolor", "#CCCCCC");
   }
   drawScene();
}

/** renommer un obstacle  */
function update(val) {
    var obs = document.getElementById("Obstacle"+val);
    if (garden.obstacles[val-2] === undefined) {
        alert("Obs not found "+val+" "+JSON.stringify(garden.obstacles));
        return;
    }
    // mise à jour du garden
    garden.obstacles[val-2].name = obs.value;
    var upd = {
        obstacle : val-2,
        name : obs.value
    } 
    // send an update to the server
    getXMLDocument("/update", upd);
}


/** Supprimer un obstacle  */
function remove(val) {
    var obs = document.getElementById("Obstacles");
    var row = document.getElementById("RowObstacle"+val);
    obs.removeChild(row);
    // send an update to the server
}

/** opens the obstacle or garden for edit */
function edit(val) {
    if (val == "garden") {
        open("mowerRecording.html?garden="+val);
    } else {
        // get the name of the row
        var editor = document.getElementById("Obstacle"+val);
        open("mowerRecording.html?garden="+editor.value);
    }
}

/** Ajouter un obstacle de la liste */
function addObstacle(obsName) { // arjoute un obstable dans le jardin ou nettoie la liste des obstacles
       var obs = document.getElementById("Obstacles");
       var num = obs.childElementCount+1;
       if (obsName == null) {
            obsName="Obstacle "+num;
       }
       var newRow = document.createElement("tr");
       newRow.setAttribute("id", "RowObstacle"+num);
       newRow.setAttribute("border", "2px solid black");
       var newObstacle = document.createElement("td");
       var img =  document.createElement("img");
       img.setAttribute("src", "obstacle.png");
       img.setAttribute("onclick", "selectObs("+num+")");
       newObstacle.appendChild(img);
       newRow.appendChild(newObstacle);
       newObstacle = document.createElement("td");
       var newField = document.createElement("input");
       newField.setAttribute("type", "text");
       newField.setAttribute("id", "Obstacle"+num);
       newField.setAttribute("value", obsName);
       newField.setAttribute("onchange", "update("+num+")");
       newObstacle.appendChild(newField);
       newRow.appendChild(newObstacle);
       newObstacle = document.createElement("td");
       img =  document.createElement("img");
       img.setAttribute("src", "edit.png");
       img.setAttribute("onclick", "edit("+num+")");
       newObstacle.appendChild(img);
       newRow.appendChild(newObstacle);
       newObstacle = document.createElement("td");
       img =  document.createElement("img");
       img.setAttribute("src", "remove.png");
       img.setAttribute("onclick", "remove('"+num+"')");
       newObstacle.appendChild(img);
       newRow.appendChild(newObstacle);
       obs.appendChild(newRow);
       // update du serveur pour ajouter l'obstacle
}



// Dessine la zone de tonte
function drawArea(context) {
    context.fillStyle = 'rgb(0, 0, 0)';
    context.fillRect(0, 0, w , h);

    context.fillStyle = 'rgb(10, 100, 10)';
// if faut suivre les points de la map
    context.beginPath();
    context.moveTo(getX(garden.points[0].x), getY(garden.points[0].y));
    for (var i = 1; i < garden.points.length; i++) {
        var point = garden.points[i];
        context.lineTo(getX(point.x), getY(point.y));
    }
    context.closePath();
    context.fill();

    // dessine la zone de limte en carrés
    context.strokeStyle = 'rgb(255, 255, 255)';
    context.lineWidth = 1;
    var minx = Math.floor(garden.bounds.minX/10)*10;
    var miny = Math.floor(garden.bounds.minY/10)*10;

    for (var i = 0; i < gardenMap.length; i++) {
        var row = gardenMap[i];
        for (var j = 0; j < row.length; j++) {
            if (gardenMap[i][j] == 1) {
                context.strokeStyle = 'rgb(255, 255, 255)';
                context.strokeRect(getX(i*10+minx), getY(j*10+10+miny), 10*taux, 10*taux);
            }
            if (gardenMap[i][j] == 2) {
                context.strokeStyle = 'rgb(255, 0, 0)';
                context.strokeRect(getX(i*10+minx), getY(j*10+10+miny), 10*taux, 10*taux);
            }
        }
    }

    if ( selectedId > -1) {
        var obs = garden.obstacles[selectedId];
        context.fillStyle = 'rgb(50, 50, 250)';
        // if faut suivre les points de la map
        context.beginPath();
        context.moveTo(getX(obs.points[0].x), getY(obs.points[0].y));
        for (var i = 1; i < obs.points.length; i++) {
            var point = obs.points[i];
            context.lineTo(getX(point.x), getY(point.y));
        }
        context.closePath();
        context.fill();
    }
}


function drawPath () {
    var context = canvas.getContext('2d');
    context.strokeStyle = 'rgb(155, 200, 100)'; 
    var minx = Math.floor(garden.bounds.minX/10)*10;
    var miny = Math.floor(garden.bounds.minY/10)*10;
    x = path[pathIndex].x;
    y = path[pathIndex].y;
    context.strokeRect(getX(x*10+minx), getY(y*10+10+miny), 10*taux, 10*taux);
    pathIndex++;
    if (pathIndex >= path.length) {
        drawScene();
        pathIndex = 0;
    }
    if (pathIndex%50 ==0) {
        showConnexion();
    }
}



function drawMower (context, x, y, angle) {
   context.save();

   // move to the center of the canvas
   context.translate(getX(x)-12, getY(y)-15);

   // rotate the canvas to the specified degrees
   context.rotate((angle+90)*Math.PI/180);

   // draw the image
   // since the context is rotated, the image will be rotated also
   context.drawImage(mowerImg, 0, 0, mowerImg.width, mowerImg.height, 0, 0, 25, 30);

   // we’re done with the rotating so restore the unrotated context
   context.restore();
}

function getX(x) {
    return x*taux+centerX;
}

function getY(y) {
    return centerY-y*taux;  
}

/****mise à jour des éléments de points  */
function updatePoints() {
    var pts = document.getElementById("objPoint");
    pts.innerText = "NB Points "+nbPoints;

    var pos = document.getElementById("objPosition");
    pos.innerText = position;
}

/**************************** 
 * enregistre le chemin  
 * ***************************/ 
function record() {
    var step = {};
    var inData = {
        element: objectName
    }
    recordPath = !recordPath;
    // mise à jour sur le serveur
    if (recordPath) {
        var img = document.getElementById("record");
        img.setAttribute("src", "recording/stop.png")
        inData.action = "start";
    } else {
        var img = document.getElementById("record");
        img.setAttribute("src", "recording/start.png")
        inData.action = "stop";
    }
    step = getXMLDocument("/recording", inData);
    position = step.x+", "+step.y;
    nbPoints = step.nbPoints;
    updatePoints();
}

/*** remet à 0 les positions */
function clean() {
    var img = document.getElementById("record");
    img.setAttribute("src", "recording/start.png")
    var step = {};
    var inData = {
        element: objectName
    }
    recordPath = false;
    inData.action = "clean";
    step = getXMLDocument("/recording", inData);
    position = step.x+", "+step.y;
    nbPoints = 0;
    updatePoints();
}

/** moving the rover to the required direction
 * function that moves are returning the number of points and the position
*/
function moving(dir) {
    var step = {};
    var inData = {
        element: objectName,
        direction : dir
    }
    step = getXMLDocument("/move", inData);
    position = step.x+", "+step.y;
    nbPoints = step.nbPoints;
    updatePoints();
}
