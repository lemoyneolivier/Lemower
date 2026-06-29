// module de gestion de la connexion à la tondeuse

var fs = require("fs");
var serialport = require('serialport');

/***Class to manage the Garden */
module.exports = {
    mower : {}, // référence à la connexion 
    logfile : "",
    myPort : "",
    isConnected : false,
    orderSent : false,
    orderList :[],
    isReady : false,
    isTest : false,
    execAction : function (data){} ,
    execInfo : function (data){},

    /** retourne un tableau de connexions USB possibles */
    getPorts : function () {
        var p = [];
        if (this.isTest) {
            p.push("TEST");
        }

        if (fs.existsSync ("/dev/ttyACM0")) {
        p.push("ttyACM0");
        } 
        if (fs.existsSync ("/dev/ttyACM1")) {
        p.push("ttyACM1");
        } 
        return p;
    },

    /*** function de log  */
    log : function (msg) {
        if (this.logfile != "") {
            fs.appendFileSync(this.logfile, "L "+Date.now()+" "+msg+"\n");
        } else {
            console.log("L "+Date.now()+" "+msg+"\n");
        }
    },


    /*** execute une commande
     *    arg = cmd 
     */
    sendCmd : function (cmd) {
        this.orderList.push(cmd);
            // envoie le message suivant si possible
        if (this.isReady) {
            var msg = this.orderList.shift(); 
            this.reply(msg);
        }
    },

    /** ouvre la connexion avec la tondeuse 
     *    port 
     *    baudRatepath.resolve
    */
    connect : function (port, baudRate) {

        if (this.isTest) {
            this.log("Test connected");
            this.isConnected = true;
            this.isReady = true;
            return;
        }

        if (this.isConnected == true) {
            this.log("Connected");
            return;
        } 

        this.targetPort = '/dev/'+port;

        const { ReadlineParser } = require('@serialport/parser-readline');
        var SerialPort = serialport.SerialPort; 
        var br = parseInt(baudRate);

        this.logfile = "./data/replay_"+Date.now()+".txt";
        try  {
            this.myPort = new SerialPort({path:this.targetPort, baudRate: br});
            this.orderSent = false;
            this.orderList =[];
            this.myPort.mod = this;

            const parser = this.myPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))
            parser.on('data', this.onData);
            parser.mod = this;
            this.myPort.on('open', this.onOpen);  

            this.myPort.on('error', function(err) {
                console.log('Error: ', err.message)
            })
            this.isConnected = true;
        } catch (error) {
            console.error(error);
            console.log("Error "+error);
            return;
        }
    },
    /**
     * Ouverture du port de communication avec Arduino
     */
    onOpen : function () {
        try {
            this.logfile = config.replay+Date.now()+".txt";
            this.log("Port is opened");
            this.isConnected = true;
        } catch (error) {
            this.isConnected = false;
        }
    },

    /** reply an order to Arduino */
    reply : function (cmd) {

        if (this.isTest) {
            return;
        }

        if (!this.isReady) {
            return;
        }
        if (this.orderSent == true) {
            return -1;
        }
        this.myPort.write(cmd+">", function(err) {
            if (err) {
                return console.log('Error on write: ', err.message)
            }
            module.exports.orderSent = true;
            module.exports.log('w '+cmd);
        });
    },
    /**
     * Réception de message venant de l'Arduino
     * @param {} data 
     */
    onData : function (data) {
        console.log("Read "+data);
        if (data == "R") {
            this.mod.isReady = true;
            // envoie le message suivant si possible
            if (this.mod.orderList.length > 0) {
                var msg = this.mod.orderList.shift(); 
                this.mod.reply(msg);
            }
        }
        if (data == "Done") { 
            //est dispo pour le prochain message
            this.mod.orderSent = false;
            // envoie le message suivant si possible
            if (this.mod.orderList.length > 0) {
                var msg = this.mod.orderList.shift(); 
                this.mod.reply(msg);
            }
            return;
        } 
        if (data[0] === "I") {
            this.mod.execInfo(data);
        } 
        if (data[0] != "I") {
        // récupère une liste d'actions à mener
            var ret = this.mod.execAction(data);
            if (ret == null) {
                return;
            }
            if (ret.length > 0) {
                for(var i = 0; i < ret.length; i++) {
                    // ajoute la ou les commandes dans le pipeline d'execution 
                    this.mod.orderList.push(ret[i]);
                }
                if (this.mod.orderSent == false) {
                    if (this.mod.orderList > 0) {
                        order = this.mod.orderList.shift();
                        // execute la commande 
                        if (order.startsWith("exec ")) { // simple commande
                            this.mod.reply (order.substring(5)); 
                        }
                    }
                }
            }
        }
    }
}

