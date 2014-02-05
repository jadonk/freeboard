var npm = require('npm');
var b = require('bonescript');
var dweetio;

var errorFile = "/var/lib/cloud9/lastFreeboardError.txt";
var dweetioName = "/var/lib/cloud9/dweetioName.txt";

b.writeTextFile(dweetioName, "Started");


try {
    dweetio = require('node-dweetio');
} catch(ex) {
    npm.load({'strict-ssl': false}, onNPMLoadForDweetio);
}

try {
    onLoadDweetio();
} catch(ex) {
    b.writeTextFile(errorFile, "Error: " + ex);
}

function onLoadDweetio() {
    if(b.getPlatform().bonescript != '0.2.4') {
        b.writeTextFile(errorFile, "Need to update BoneScript to version 0.2.4");
        return;
    }

    var dweetioClient = new dweetio();

    // Bacon Cape support
    var dweetData = {
        "Slider": 0,
        "Button": 0,
        "Accelerometer": {
            X: 0,
            Y: 0,
            Z: 0
        }
    };

    var BUTTON = "P8_19";
    var POT = 'P9_36';
    var port = '/dev/i2c-2';
    var address = 0x1c;
    b.pinMode(BUTTON, b.INPUT);
    b.i2cOpen(port, address, {}, onI2C); // Open I2C port
    b.i2cWriteBytes(port, 0x2a, [0x00]); // Set accelerometer in STANDBY mode
    b.i2cWriteBytes(port, 0x0e, [0x00]); // Set accelerometer scale to 2G
    b.i2cWriteBytes(port, 0x2a, [0x01]); // Set accelerometer in ACTIVE mode

    function onI2C() {
    }

    function readCape() {
        b.i2cReadBytes(port, 1, 6, onReadBytes);
    }

    function onReadBytes(x) {
        if(x.event == 'callback') {
            dweetData.Accelerometer.X = convertToG(x.res[0]); // First byte is X
            dweetData.Accelerometer.Y = convertToG(x.res[2]);
            dweetData.Accelerometer.Z = convertToG(x.res[4]);
            b.analogRead(POT, onAnalogRead);
        }
    }

    function onAnalogRead(x) {
        dweetData.Slider = x.value;
        b.digitalRead(BUTTON, onDigitalRead);
    }

    function onDigitalRead(x) {
        dweetData.Button = x.value;
        doDweet();
    }

    function convertToG(x) {
        if(x >= 128) x = -((x^0xFF)+1); // Get two's complement
        x = x / 64; // Scale to G
        x = x.toFixed(2); // Limit decimal places
        return(x);
    }
    // End of Bacon Cape support

    readCape();

    function doDweet() {
        dweetioClient.dweet(dweetData, onDweet);
    }

    function onDweet(err, dweet) {
        var errMsg = "onDweet: " + err + "\n" + JSON.stringify(dweet);
        if(typeof dweet.thing == "string") {
            b.writeTextFile(dweetioName, dweet.thing);
        }
        b.writeTextFile(errorFile, errMsg);
        setTimeout(readCape, 500);
    }
}

function onNPMLoadForDweetio(err) {
    if(err) {
        var errMsg = "onNPMLoadForDweetio: " + err;
        b.writeTextFile(errorFile, errMsg);
        return;
    }
    npm.commands.install('/usr/lib', ['node-dweetio'], onDweetioInstall);
}

function onDweetioInstall() {
    try {
        dweetio = require('node-dweetio');
    } catch(ex) {
        b.writeTextFile(errorFile, "Failed to install dweetio module: " + ex);
        return;
    }
    try {
        onLoadDweetio();
    } catch(ex) {
        b.writeTextFile(errorFile, "Error: " + ex);
        return;
    }
}

