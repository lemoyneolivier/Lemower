var obectId = -1;
var objectName = "Garden";
var nbPoints = 0;
var position = "0, 0";
var recordPath = false;


function getXMLDocument (fname, data) {
	var xhttp = new XMLHttpRequest();
    if (data === null) {
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
    const urlParams = new URLSearchParams(window.location.search);  
    const dataParam = urlParams.get('garden');  
   
    if (!dataParam) {  
        showMessage("No garden parameter was passed to this page");  
        return;  
    }  
    const decodedData = decodeURIComponent(dataParam);
    const params = new URLSearchParams(decodedData);  
    
    if (params.size === 0) {  
        showMessage("No data parameter was passed to this page");  
        return;  
    }  
    objectName = decodedData;

    var garden = getXMLDocument("/garden", null);
    if (objectName === "garden") {disabled
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
    var img = document.getElementById("recorddisabled");
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
