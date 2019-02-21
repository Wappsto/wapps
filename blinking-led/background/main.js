/* Note that some of this code is repeated from the foreground js file. Common instantiation of objects between the foreground and background is on the road map. */
const Wappsto = require('wapp-api');
let wappsto = new Wappsto();

let wappstoConsole = require("wapp-api/console");
wappstoConsole.start();

let blinking,
    data,
    wStream,
    ledControlState;

getStream();
getLED();
getData();

function getLED(){
  wappsto.functions.get("device", {"name": "LED"}, {
    "quantity": "1",
    "expand": 5,
    "success": (collection, response) => {
      if(collection.length === 1){
        ledControlState = collection.first().get("value").findWhere({name: "On_OFF"}).get("state").findWhere({type: "Control"});
      }
    }
  });
}

function getData(){
  wappsto.functions.get("data", {}, {
    "success": (collection, response) => {
      data = collection.first();
      if(wStream){
        wStream.subscribe(data);
      }
      data.on("change:blink", function() {
        /* Here's the actual functionality */
        if (data.get("blink")) {
          blink();
        } else {
          stopBlinking();
        }
      });
    }
  });
}


function blink() {
  if (!blinking) {
    blinking = setInterval(function() {
      if (ledControlState && ledControlState.get("data") == "1") {
        saveControlValue("0");
      } else {
        saveControlValue("1");
      }
    }, 1000);
  }
}

function stopBlinking() {
  if (blinking) {
    clearInterval(blinking);
    blinking = false;
  }
}


function saveControlValue(theValue) {
  ledControlState.save({ data: theValue }, { patch: true });
}

// create and initialize stream
function getStream() {
  wappsto.functions.get('stream', {}, {
    expand: 1,
    success: function(streamCollection) {
      if (streamCollection.length > 0) {
        let stream = streamCollection.first();
        startStream(stream);
      } else {
        createStream();
      }
    },
    error: function() {
      createStream();
    }
  });
}

function createStream() {
  let stream = new wappsto.models.Stream();
  stream.save({}, {
    success: function() {
      startStream(stream);
    },
    error: function() {
      console.log('could not contact server');
    }
  });
}

function startStream(stream) {
  wStream = new wappsto.Stream(stream);
  wStream.open();
  wStream.subscribe('/notification');
  wStream.on('permission:added', function() {
    console.log("permission added");
    getLED();
  });
  if(data){
    wStream.subscribe(data);
  }
}
