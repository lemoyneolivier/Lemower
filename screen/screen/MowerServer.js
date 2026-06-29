const http = require("http");
const fs = require("fs");
const path = require("path");
const garden = require("../screen/mowerGardenLib.js");
const mower = require("../screen/mowerLib.js");




//dirname = "c:/Users/a025237/Code/";

var robotPosition = {
  x : 0,
  y : 0,
  direction : 0 /// degrès par rapport ç l'axe Y
}

var addPointNext= false;
var isRecording = false;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

const publicDir = path.resolve(__dirname)+'/HTML';

const gardenFile = path.join(publicDir, 'garden.json');
garden.readGarden(gardenFile);

/**
 * bouge le robot et enregistre ou pas
 * @param {*} element 
 * @param {*} dir 
 */
function move(element, dir) {
  if (robotPosition.x === undefined) {
    robotPosition.x = 0;
  }
  if (robotPosition.y === undefined) {
    robotPosition.y = 0;
  }
  if (robotPosition.direction === undefined) {
    robotPosition.direction = 0;
  }
  var rep = {
      x:robotPosition.x,
      y:robotPosition.y
  };
  if (dir == "forward") {
    if (addPointNext ) {
      garden.addPoint(rep, element);
      addPointNext = false;

      if (rep === null) {
        console.log("Element not found : "+element);
        return rep;
      }
    }
    mower.sendCmd("f");
    robotPosition.x += Math.floor(garden.stepSize*Math.cos(robotPosition.direction/180*Math.PI)*1000.0)/1000.0;
    robotPosition.y += Math.floor(garden.stepSize*Math.sin(robotPosition.direction/180*Math.PI)*1000.0)/1000.0;
    rep.x = robotPosition.x;
    rep.y = robotPosition.y;
    // fait avancer le rover
  }
  if (dir == "backward") {
    if (addPointNext) {
      garden.addPoint(rep, element);
      addPointNext = false;

      if (rep === null) {
        console.log("Element not found : "+element);
        return;
      }
    }
    mower.sendCmd("b");
    robotPosition.x -= Math.floor(garden.stepSize*Math.cos(robotPosition.direction/180*Math.PI)*1000.0)/1000.0;
    robotPosition.y -= Math.floor(garden.stepSize*Math.sin(robotPosition.direction/180*Math.PI)*1000.0)/1000.0;
    rep.x = robotPosition.x;
    rep.y = robotPosition.y;
  }

  if (dir == "left") {
    addPointNext = true;
    mower.sendCmd("t -"+garden.angleGap);
    robotPosition.direction -= garden.angleGap;
  }
  if (dir == "right") {
    addPointNext = true;
    mower.sendCmd("t "+garden.angleGap);
    robotPosition.direction += garden.angleGap;
  }
  if (robotPosition.direction > 180) {
      robotPosition.direction -= 360;
  }
  if (robotPosition.direction < -180) {
      robotPosition.direction += 360;
  }
  return rep;
}

const requestListener = (req, res) => {

  // update un object name  
  if (req.url === '/update') {
      let body = "";
      req.on("data", data => {
        body += data.toString(); 
      });
      req.on("end", () => {
        // mise à jour du jardin - changement de nom
        var ask = JSON.parse(body);
        //ask.obstacle;
        var nb = garden.getNbObstacles();
        if (ask.obstacle > nb) {
          console.log("Obstacle index in error "+ask.obstacle+", "+nb);
        } else {
          garden.updateName(ask.obstacle, ask,name);
          garden.writeGarden();
        }
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(garden));
      return;
  }

  /****
   *  démarrage     var rep = {
/ arret du recording
   * ***************************************/ 
  if (req.url== '/recording') {
      let body = "";
      req.on("data", data => {
        body += data.toString(); 
      });

      req.on("end", () => {
        // mise à jour du jardin - changement de nom
        console.log("record "+body);
        var ask = JSON.parse(body);
        var obs = garden.getGardenElement(ask.element);
        if (obs === undefined) {
          console.log("Obstacle not found "+ask.element);
          return;
        }
        if (ask.action == "start") {
          isRecording = true;
        } else {
          isRecording = false;
        }
 
        if (obs.points.length > 0) {
          var pt = obs.points[obs.points.length-1];
          if (pt != null) {
            //on ajout un point ou supprime tous les points
            if (ask.action == "start") {
              if (pt.x != robotPosition.x || pt.y != robotPosition.y) {
                if (isRecording) {
                  garden.addPoint({x:robotPosition.x, y:robotPosition.y}, ask.element);
                }
              }
            } 
            if (ask.action == "clean") {
              console.log("vide les points");
              garden.cleanPoints(ask.element);
            }
          } else {
            if (isRecording) {
              garden.addPoint({x:robotPosition.x, y:robotPosition.y}, ask.element);
            }
          }
        } else {
            if (isRecording) {
              garden.addPoint({x:robotPosition.x, y:robotPosition.y}, ask.element);
            }
        }
        var rep = {
          x: robotPosition.x,
          y: robotPosition.y,
          nbPoints: obs.points.length
        };
        garden.writeGarden();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rep));
        return;
      });
      return;
  }

    /****
   *  moving the robot
   * ***************************************/ 
  if (req.url== '/move') {
      let body = "";
      req.on("data", data => {
        body += data.toString(); 
      });

      req.on("end", () => {
        var ask = JSON.parse(body);
        var obs = garden.getGardenElement(ask.element);
        if (obs === undefined || obs === null) {
          console.log("Element not found "+ask.element);
          return;
        }

        // mouvemnt du rover
        var rep = move(ask.element, ask.direction);
        rep.nbPoints = obs.points.length;
        console.log("Move : "+JSON.stringify(rep));
        garden.writeGarden();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rep));
        return;
      });
      return;
  }

    /****
   *  Opening a connexion to the robot
   * ***************************************/ 
  if (req.url== '/connexion') {
      let body = "";
      req.on("data", data => {
        body += data.toString(); 
      });

      req.on("end", () => {
        var ask = JSON.parse(body);
        mower.connect(ask.port, ask.baudRate);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({status:"ok"}));
        return;
      });
      return;
  }



  if (req.url== '/position') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(robotPosition));
      return;
  }

  /** returns a status based on 
   *     connexion status, position, bettary, mowing position
   */
  if (req.url== '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      var result = {};
      if (mower.isConnected) {
        if (mower.isReady) {
          result.connexion = "Ready";
        } else {
          result.connexion = "Connecting";
        }
      } else {
          result.connexion = "Not";
      }
      res.end(JSON.stringify(result));
      return;
  }

  // retrieve the garden details
  if (req.url === '/garden') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(garden.getGardenElement(garden.gardenName)));
      return;
    };

    // Using fs to determine the list of tty ports
  if (req.url === '/ports') {
    var rep = {
        ports:mower.getPorts()
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rep));
    return;
  }


if (req.url === '/path') {
    fs.readFile(path.join(publicDir, 'path.json'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'X-Content-Type-Options': 'nosniff' });
        res.end('Server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  if (req.url === '/map') {
    fs.readFile(path.join(publicDir, 'gardenMap.json'), 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'X-Content-Type-Options': 'nosniff' });
        res.end('Server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
    return;
  }

  // Normalize the request path
  let reqPath = req.url === '/' ? '/mowerSetting.html' : req.url;
  
  // Strip query string - ?id=123 shouldn't affect file path
  reqPath = reqPath.split('?')[0];
  
  // Resolve path and check it stays within publicDir
  // The '.' prefix prevents absolute paths from being resolved incorrectly
  const safePath = path.resolve(publicDir, '.' + reqPath);
  
  // Critical security check: ensure resolved path is within publicDir
  if (!safePath.startsWith(publicDir)) {
    res.writeHead(403, { 'X-Content-Type-Options': 'nosniff' });
    res.end('Forbidden');
    return;
  }
  
  // Check if file exists and is actually a file (not a directory)
  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'X-Content-Type-Options': 'nosniff' });
      res.end('File not found '+safePath);
      return;
    }
    
    // Determine MIME type from file extension
    const ext = path.extname(safePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff"); // Prevents MIME sniffing attacks
    res.writeHead(200);
    
    // Stream file instead of loading into memory
    // Critical for large files - won't consume all memory
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
    
    stream.on('error', () => {
      // File might be deleted between stat() and createReadStream()
      res.writeHead(500, { 'X-Content-Type-Options': 'nosniff' });
      res.end('Server error');
    });
  });
}



/****Start of the server */
const port = 3000;
const server = http.createServer(requestListener);
server.listen(port, '127.0.0.1', () => {
  console.log(`Server is running on http://1270.0.0.1:${port}`);
  console.log(`Serving static files from: ${publicDir}`);
});
