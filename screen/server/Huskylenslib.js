/**************************************************************************************************
 * Huskylens library in JS from PYTHON 
 * 
 * Module to manage the Huskylens
 * 
 * 
 */

serial = require("Serial");
i2c = require("i2c-bus");

module.exports.commandHeaderAndAddress = "55AA11";
module.exports.algorthimsByteID = {
    "ALGORITHM_OBJECT_TRACKING": "0100",
    "ALGORITHM_FACE_RECOGNITION": "0000",
    "ALGORITHM_OBJECT_RECOGNITION": "0200",
    "ALGORITHM_LINE_TRACKING": "0300",
    "ALGORITHM_COLOR_RECOGNITION": "0400",
    "ALGORITHM_TAG_RECOGNITION": "0500",
    "ALGORITHM_OBJECT_CLASSIFICATION": "0600",
    "ALGORITHM_QR_CODE_RECOGNTITION" : "0700",
    "ALGORITHM_BARCODE_RECOGNTITION":"0800",
}

/***Class to manage Arrows */
module.exports = class Arrow {
 
    constructor(xT, yT , xH , y, id) {
        this.xTail=xT;
        this.yTail=yT;
        this.xHead=xH;
        this.yHead=yH;
        this.ID=id;
        this.learned= (id > 0);
        this.type="ARROW"
    }
}

/***Class to manage Blocks */
module.exports = class Block {
 
    constructor(x, y , w , h, id) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.heigh = h;
        this.ID = id;
        this.learned= (id > 0);
        this.type="BLOCK"
    }
}

module.exports = class HuskyLensLibrary {

    constructor(prototype, comPort="", speed=3000000, cnl=1, addr=0x32) {
        this.proto = prototype;
        this.address = addr;
        this.checkOnceAgain=true;
        if (this.proto == "SERIAL") {
            this.huskylensSer =serial.Serial(
                baudrate=speed,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=0.5
            );
            this.huskylensSer.dtr = false;
            this.huskylensSer.rts = false;
            await delay(100);
            this.huskylensSer.port=comPort;
            this.huskylensSer.open();
            await delay(2000);
            this.knock();
            await delay(500);
            this.knock();
            await delay(500);
            this.knock();
//            # self.huskylensSer.timeout=5
            this.huskylensSer.flushInput();
            this.huskylensSer.flushOutput();
            this.huskylensSer.flush();
        }
        if (proto == "I2C") {
            this.huskylensSer = i2c.openSync(1);
        }
        this.lastCmdSent = "";
    }

    writeToHuskyLens(cmd) {
        lastCmdSent = cmd;
        if(proto == "SERIAL"){:
            huskylensSer.flush()
            huskylensSer.flushInput()
            huskylensSer.write(cmd)
        } else {
            huskylensSer.write_i2c_block_data(address, 12, list(cmd));
        }
    }

    calculateChecksum(hexStr){:
        var total = 0
        for(var i = 0; i < len(hexStr); i += 2) {
            total += int(hexStr[i:i+2], 16);
        }
        hexStr = (hex(total).substr(2);
        return hexStr
    }

    splitCommandToParts(str){
        // print(f"We got this str=> {str}")
        headers = str.substr(0, 4);
        headers = str.substr(4, 2);
        data_length = parseInt(str.substr(6, 2), 16); 
        command = str.substr(8, 2);
        if(data_length > 0){
            data = str.substr(4, data_length*2);
        } else {
            data = [];
        }
        checkSum = str.substr(2*(6+data_length-1), 2);
        return [headers, address, data_length, command, data, checkSum];
    }

    
    getBlockOrArrowCommand(){
        var byteString="";
        if (proto == "SERIAL") {
            byteString = huskylensSer.read(5);
            byteString += huskylensSer.read(ParseInt(byteString[3], 16));
            byteString += huskylensSer.read(1);
        } else {
            byteString = '';
            for  (var i=0; i < 5; i++) {
                byteString += bytes([(huskylensSer.read_byte(address))]);
            }
            for  (var i=0; i < parseInt(byteString[3]+1; i++) {
                byteString += bytes([(huskylensSer.read_byte(address))])
            }
        }
        commandSplit = splitCommandToParts(byteString)
        isBlock = (commandSplit[3] == "2a");
        return (commandSplit[4], isBlock)
    }

    processReturnData(numIdLearnFlag=false, frameFlag=false) {
        var inProduction = true;
        var byteString=""
        if (inProduction) {
            try {
                if (proto == "SERIAL"){
                    byteString = huskylensSer.read(5);
                    byteString += huskylensSer.read(parseInt(byteString[3], 16));
                    byteString += huskylensSer.read(1);
                } else {
                    byteString = b''
                    for  (var i=0; i < 5; i++) {
                        byteString += bytes([(huskylensSer.read_byte(address))]);
                    }
                    for  (var i=0; i < parseInt(byteString[3]+1; i++) {
                        byteString += bytes([(huskylensSer.read_byte(address))])
                    }
                }
                commandSplit = splitCommandToParts(byteString.hex());
                //# print(commandSplit)
                if (commandSplit[3] == "2e") {
                    self.checkOnceAgain=true;
                    return "Knock Recieved";
                } else {
                    var returnData = [];
                    var numberOfBlocksOrArrow = int(commandSplit[4].substr(2,2)+commandSplit[4].substr(0,2), 16);
                    numberOfIDLearned = int(commandSplit[4].substr(6,2)+commandSplit[4].substr(4,2), 16);
                    frameNumber = int(commandSplit[4].substr(10,2)+commandSplit[4].substr(8,2), 16);
                    isBlock=true;
                    for ( var i= 0; i < numberOfBlocksOrArrow; i++) {
                        var tmpObj=getBlockOrArrowCommand();
                        isBlock=tmpObj[1];
                        returnData.push(tmpObj[0]);
                    }
                    //# isBlock = True if commandSplit[3] == "2A"else False
                    var finalData = [];
                    var tmp = []
                    //# print(returnData)
                    for(var i= 0; i < returnData.length; i++) {
                        iVal = returnData[i];
                        tmp = [];
                        for (var q=0; q < len(i); q+= 4) {
                            var low=parseInt(iVal.substr(q,2), 16);
                            var high=parseInt(iVal./substr(q+2, 2), 16);
                            var val;
                            if (high>0){
                                val=low+255+high;
                            } else {
                                val=low;
                            }
                            tmp.append(val);
                        }
                        finalData.append(tmp);
                        tmp = []
                    }
                    this.checkOnceAgain=True
                    ret=convert_to_class_object(finalData, isBlock)
                    if (numIdLearnFlag) {
                        ret.push(numberOfIDLearned);
                    }
                    if(frameFlag) {
                        ret.ûsh(frameNumber);
                    }
                    return ret;
                } exception (e) { 
                    if (checkOnceAgain) {
                        huskylensSer.timeout=5;
                        checkOnceAgain=false;
                        huskylensSer.timeout=.5;
                        return processReturnData();
                    }
                    print("Read response error, please try again")
                    huskylensSer.flushInput();
                    huskylensSer.flushOutput();
                    huskylensSer.flush();
                    return [];
                }
            }
        }
    }

    convert_to_class_object(data,isBlock) {
        tmp=[];
        for (var i= 0; i < data.length; i++) {
            var iVal = data[i];
            if (isBlock) {
                obj = Block(iVal[0],iVal[1],iVal[2],iVal[3],iVal[4]);
            } else {
                obj = Arrow(iVal[0],iVal[1],iVal[2],iVal[3],iVal[4]);
            }
            tmp.push(obj);
        }
        return tmp;
    }

    knock(){
        var cmd = commandHeaderAndAddress+"002c3c";
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    learn(x) {
        var data = "{:04x}".format(x);
        part1=data.substr(2);
        part2=data.substr(0, 2);
        //#reverse to correct endiness
        data=part1+part2;
        dataLen = "{:02x}".format(data.length/2);
        var cmd = commandHeaderAndAddress+dataLen+"36"+data;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    forget() {
        cmd = cmdToBytes(commandHeaderAndAddress+"003747");
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    setCustomName(name, idV) {
        var nameDataSize = "{:02x}".format(name.length+1);
        name = name.encode("utf-8").hex()+"00";
        var localId = "{:02x}".format(idV);
        var data = localId+nameDataSize+name;
        var dataLen = "{:02x}".format(data.length/2);
        cmd = commandHeaderAndAddress+dataLen+"2f"+data;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    customText(nameV, xV, yV) {
        var name=Buffer.from(nameV).toString("utf-8");
        var nameDataSize = "{:02x}".format(name.length/2);
        if(xV>255) {
            x="ff"+"{:02x}".format(xV%255);
        } else {
            x="00"+"{:02x}".format(xV);
        }
        y="{:02x}".format(yV);

        data = nameDataSize+x+y+name;
        dataLen = "{:02x}".format(data.length/2);

        var cmd = commandHeaderAndAddress+dataLen+"34"+data;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    clearText() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"003545");
        writeToHuskyLens(cmd)
        return processReturnData();
    }

    requestAll() {
        cmd = cmdToBytes(commandHeaderAndAddress+"002030");
        writeToHuskyLens(cmd);
        return processReturnData();
    }
    
    saveModelToSDCard(idVal) {
        idVal = "{:04x}".format(idVal);
        idVal = idVal.substr(2)+idVal.substr(0, 2);
        var cmd = commandHeaderAndAddress+"0232"+idVal;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    loadModelFromSDCard(idVal) {
        idVal = "{:04x}".format(idVal);
        idVal = idVal.substr(2)+idVal.substr(0, 2);
        var cmd = commandHeaderAndAddress+"0233"+idVal;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    savePictureToSDCard() {
        huskylensSer.timeout=5;
        var cmd = cmdToBytes(commandHeaderAndAddress+"003040");
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    saveScreenshotToSDCard() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"003949");
        writeToHuskyLens(cmd);
        return processReturnData();
    }

    blocks() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002131");
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    arrows() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002232");
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    learned() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002333");
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    learnedBlocks() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002434");
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    learnedArrows() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002535");
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    getObjectByID(idVal) {
        idVal = "{:04x}".format(idVal);
        idVal = idVal.substr(2)+idVal.substr(0, 2);
        var cmd = commandHeaderAndAddress+"0226"+idVal;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    getBlocksByID(idVal) {
        idVal = "{:04x}".format(idVal);
        idVal = idVal.substr(2)+idVal.substr(0, 2);
        var cmd = commandHeaderAndAddress+"0227"+idVal;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    getArrowsByID(idVal){
        idVal = "{:04x}".format(idVal);
        idVal = idVal.substr(2)+idVal.substr(0, 2);
        var cmd = commandHeaderAndAddress+"0228"+idVal;
        cmd += calculateChecksum(cmd);
        cmd = cmdToBytes(cmd);
        writeToHuskyLens(cmd);
        return processReturnData()[0];
    }

    algorthim(alg) {
        if (algorthimsByteID.indexOf(alg) != -1) {
            var cmd = commandHeaderAndAddress+"022d"+algorthimsByteID[alg];
            cmd += calculateChecksum(cmd);
            cmd = cmdToBytes(cmd);
            writeToHuskyLens(cmd);
            return processReturnData();
        } else {
            console.log("INCORRECT ALGORITHIM NAME");
        }
    }

    count() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002030");
        writeToHuskyLens(cmd);
        return processReturnData().length;
    }
    
    learnedObjCount() {
        var cmd = cmdToBytes(commandHeaderAndAddress+"002030");
        writeToHuskyLens(cmd);
        return processReturnData(numIdLearnFlag=true)[-1];
    }
    
    frameNumber() {
        var cmd = self.cmdToBytes(commandHeaderAndAddress+"002030");
        writeToHuskyLens(cmd);
        return processReturnData(frameFlag=true)[-1];
    }
}