/* Wappsto's data model Device > Value > State is used to describe the led. Device:Led, Value:on/off, State:'on' or 'off'. The report value tells us the actual status. The Control value is what we send.) */

/* defining global variables */

let wappsto = new Wappsto();
let led,
data,
wStream,
ledReportState,
ledControlState;

/* this is Wapp-API function that promts a request to the user that allows to match yourcdevice to the installation of this app */

function getLED(){
  wappsto.functions.get("device", {"name": "LED"}, {
    "quantity": "1",
    "expand": 5,
    "success": (collection, response) => {
      if(collection.length === 1){
        led = collection.first();
        if(wStream){
          wStream.subscribe(led);
        }
        start(led);
      }
    }
  });
}

/* The Data object associated with the Network allows for sharing between foreground
and background tasks */

function getData(){
  wappsto.functions.get("data", {}, {
    "success": (collection, response) => {
      data = collection.first();
      console.log(data);
    }
  });
}

function start(led){
  console.log("START");

  var ledOnOff = led.get("value").findWhere({ name: "On_OFF" });

  ledReportState = ledOnOff.get("state").findWhere({ type: "Report" });
  ledControlState = ledOnOff.get("state").findWhere({ type: "Control" });

  displayReportValue();

  ledReportState.on("change:data", function() {
    displayReportValue();
  });

}
function turnOn() {
  saveControlValue("1");
}

function turnOff() {
  saveControlValue("0");
}

function blink() {
  data.save({ blink: true }, { patch: true });
}

function stopBlinking() {
  data.save({ blink: false }, { patch: true });
}

function saveControlValue(theValue) {
  ledControlState.save({data: theValue }, { patch: true });
}

function displayReportValue() {
  var reportValue = ledReportState.get("data");
  if (document.getElementById("reportValue")) {
    document.getElementById("reportValue").innerHTML = "Your LED is: " + reportValue;
  }
}

getLED();
getData();
getStream();

// Create stream
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
  if(led){
    wStream.subscribe(led);
  }
}
