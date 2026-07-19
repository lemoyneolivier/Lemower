
const CONNEXION_OFF = -1;
const CONNEXION_PENDING = 0;
const CONNEXION_ON = 1;


var position = "0, 0"; // position of the robot
var batteryLevel = 100; // percentage of the battery
var connexionStatus = CONNEXION_OFF;
var collision = 0;  // 0 = pas de collisison


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
    // testing the connexion if only one port is available
    getPorts();
    openConnexion();


    showConnexion();
    if (connexionStatus) {
        showStatus();
    }
    // affiche le status toutes les secondes
    setInterval(showStatus, 1000);
}

function showConnexion () {
    if (connexionStatus == CONNEXION_OFF) {
        var tble = document.getElementById("head");
        tble.style.display = "none";
        tble = document.getElementById("connexion");
        tble.style.display = "block";
        tble = document.getElementById("wait");
        tble.style.display = "none";
    } else {
        if (connexionStatus == CONNEXION_ON) {
            var tble = document.getElementById("head");
            tble.style.display = "block";
            tble = document.getElementById("connexion");
            tble.style.display = "none";
            tble = document.getElementById("wait");
            tble.style.display = "none";
        } else { // PENDING
            var tble = document.getElementById("head");
            tble.style.display = "none";
            tble = document.getElementById("connexion");
            tble.style.display = "none";
            tble = document.getElementById("wait");
            tble.style.display = "block";
        }
    }
}


function showStatus () {
    // verifie le statut de connexion avec ARDUINO
    var cxn = getXMLDocument("/status", null);
    if (cxn.connexion == "Ready") {
        connexionStatus = CONNEXION_ON;
        showConnexion();
    } 
    if (cxn.connexion == "Connecting") {
        connexionStatus = CONNEXION_PENDING;    //
        showConnexion();
        return;
    }
    if (cxn.connexion == "Not") {
        connexionStatus = CONNEXION_OFF;
        showConnexion();
        return;
    }
    /// la connexion est ok
    //result.position.x 
    //result.position.y 
    document.getElementById("position").innerText = "Position: "+cxn.position.x+", "+cxn.position.y;
    //result.position.dir 
    document.getElementById("direction").innerText = "Direction: "+cxn.position.dir;
    //result.battery =
    var img = document.getElementById("batterie");
    if (cxn.battery > 80) {
        img.src = "imgs/BatPlein.png";
    } else {
        if (cxn.battery > 20) {
            img.src = "imgs/BatMidle.png";
        } else {
            img.src = "imgs/BatVide.png";
        }
    }
    var pct = document.getElementById("batteriePct");
    pct.innerText = cxn.battery+"%";

    //result.collision = 1;
    img = document.getElementById("collision");
    if (cxn.collision != 1) {
            img.src = "imgs/NoCollision.png";
    } else {
            img.src = "imgs/Collision.png";
    }
//result.logs = mower.logList;

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
   if (list.length == 1) {
        select.select(list.ports[0]);
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
        if (cnx.status == "ok") {
            connexionStatus = true;
            showConnexion();
            showStatus();
        }
    }
}

/** moving the rover to the required direction
 * function that moves are returning the number of points and the position
*/
function moving(dir) {
    var step = {};
    var inData = {
        element: "Garden",
        direction : dir
    }
    step = getXMLDocument("/move", inData);
}
