var beaglebone = (function() {
    function setTargetAddress(address, handlers) {
        console.log("Attempting to connect to BeagleBone directly at " + address);
        var url = address;
        url = url.replace(/^(http:\/\/|https:\/\/)*/, 'http://');
        url = url.replace(/(\/)*$/, '/bonescript.js');
        var oldHead = (typeof head == 'undefined') ? null : head;
        var oldScript = (typeof script == 'undefined') ? null : script;
        head.js(url, addHandlers);

        function addHandlers() {
            head = oldHead;
            script = oldScript;
            if(typeof _bonescript != 'undefined') {
                _bonescript.address = address;
                _bonescript.on.initialized = onBoneScriptInit;
                _bonescript.on.connect = onBoneScriptConnect;
                _bonescript.on.connecting = onBoneScriptNotConnected;
                _bonescript.on.disconnect = onBoneScriptNotConnected;
                _bonescript.on.connect_failed = onBoneScriptNotConnected;
                _bonescript.on.reconnect_failed = onBoneScriptNotConnected;
                _bonescript.on.reconnect = onBoneScriptNotConnected;
                _bonescript.on.reconnecting = onBoneScriptNotConnected;
            }
        }
    }

    // borrowed from ../freeboard/freeboard.js
    function getParameterByName(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function onBoneScriptInit() {
        var b = require('bonescript');
        console.log("Loaded BoneScript library from target");

        var targetJS = 'js/beaglebone/freeboard.bonescript.js';
        b.getPlatform(onGetPlatform);

        function onGetPlatform(platform) {
            console.log("Running BoneScript version " + platform.bonescript);
            b.setDate(Date().toString(), onSetDate);
        }

        function onSetDate() {
            console.log("Reading " + targetJS);
            jQuery.get(targetJS, onJSReadSuccess, 'text').fail(onJSReadFail);
        }

        function onJSReadSuccess(freeboardBoneScriptJS) {
            b.writeTextFile("/var/lib/cloud9/autorun/freeboard.bonescript.js", 
                freeboardBoneScriptJS, onFreeboardBoneScriptWritten
            );
        }

        function onJSReadFail() {
            console.log("Failed to read " + targetJS);
        }

        function onFreeboardBoneScriptWritten() {
            console.log(targetJS + " written to /var/lib/cloud9/autorun");
            //getFreeboardError();
            getDweetioName();
        }

        function getDweetioName() {
            console.log("Attempting to read dweetioName.txt");
            b.readTextFile("/var/lib/cloud9/dweetioName.txt", onReadDweetioName);
        }

        function onReadDweetioName(x) {
            if(x.err) {
                setTimeout(getDweetioName, 5000);
                return;
            }
            onDweetioName(x.data);
        }
    }

    function onBoneScriptConnect() {
        console.log("Connected to BeagleBone at address " + _bonescript.address);
    }

    function onBoneScriptNotConnected() {
        console.log("Lost connection to BeagleBone at address " + _bonescript.address);
    }

    function onDweetioName(dweetioname) {
        console.log("Attempting to connect to BeagleBone through dweet.io at " + dweetioname);
    }

    return ({
        initialize: function() {
            var address = getParameterByName("address");
            var dweetioname = getParameterByName("dweetioname");
            if(dweetioname == "" && address != "") {
                setTargetAddress(address);
            } else if(dweetioname != "") {
                onDweetioname(dweetioname);
            } else {
                console.log("Need to specify 'address' or 'dweetioname' to connect to BeagleBone");
            }
        }
    });
}());
