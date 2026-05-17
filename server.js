var express = require("express");
const readline = require('readline');
const fs = require('fs');
var session = require('express-session');
var bodyParser = require('body-parser');

const router = express.Router();

var app = express();
app.use(session({secret: 'ssshhhhh',saveUninitialized: true,resave: true}));
app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/HTML'));

var config = {};
if (process.argv.length > 2) {
  if (fs.existsSync(process.argv[2])) {
	let rawdata = fs.readFileSync(process.argv[2]);
	config = JSON.parse(rawdata);
  } else { 
	console.error("Defined config file not found !\n"+process.argv[2]);
	return 1;
  }
} else  {
  if (fs.existsSync("./config.json")) {
	let rawdata = fs.readFileSync("./config.json");
	config = JSON.parse(rawdata);
  } else {
	console.error("Default config file not found !");
	return 1;
  }
}

const mapManagement = require("./maps.js");
const gardenMap = mapManagement.readFromFile(config.mapFileName);

app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());


/* Route / (login page) */
app.get("/", function(req, res) {
	res.sendFile(__dirname+'/HTML/mowerScreen.html');
});

/* Route / (login page) */
app.get("/home", function(req, res) {
	res.sendFile(__dirname+'/HTML/mowerScreen.html');
});



app.get("/tracefiles", function(req, res) {
	data = fs.readdirSync(config.traceFileDir);
	res.send(data);
});

app.get("/map", function(req, res) {
	map= {};
	map.cost = gardenMap.costMap;
	map.bounds  = gardenMap.zone;
	map.mower = gardenMap.grassCut;
	res.send(map);
});


/* Route /positions (kpi list) */
app.get("/positions", function(req, res) {
	// Ouver le fichier des positions et envoie la position
	filename = config.traceFileDir+'/'+req.query.filename;

	if (filename== "") return {};

	var retour = {};
	retour.posList = [];
	if (fs.existsSync(filename)) {
		fs.readFile(filename, 'utf8', (err, data) => {
			if (err) {
				console.error(err);
				return;    
			}
			test =data.split("\n");
	
			for (i = 0; i < test.length; i++) {
				info = test[i];
				const words = info.split(" ");
				if (words[0] == "I") {
					// gestion de l'interprétation des données 
					elem = {
						x: words[1], 
						y: words[2], 
						dir: words[3], 
						speed: words[4], 
						battery: words[5], 
						collision: words[6], 
					};
					retour.posList.push(elem);
				}
			}
			res.send(retour);
		});
	} else {
		console.error("File not found - "+filename);
	}
});

var port = 1338;
app.listen(port, function() {
		console.log("Node js is running");
});
