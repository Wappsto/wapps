/* Wappsto's data model Device > Value > State is used to describe the led. Device:Led, Value:on/off, State:'on' or 'off'. The report value tells us the actual status. The Control value is what we send.) */

/* defining global variables */

let wappsto = new Wappsto();
let led,
data,
ledReportState,
ledControlState;

/* this is Wapp-API function that promts a request to the user that allows to match yourcdevice to the installation of this app */

wappsto.get("device", {"name": "Bulb"}, {
  "quantity": "1",
  "expand": 5,
  "subscribe":true,
  "success": (collection, response) => {
    if(collection.length === 1){
      led = collection.first();
      start(led);
    }
  }
});

/* The Data object associated with the Network allows for sharing between foreground
and background tasks */


wappsto.get("data", {}, {
  "success": (collection, response) => {
    data = collection.first();
    console.log(data);
  }
});

function start(led){
  console.log("START");

  var ledOnOff = led.get("value").findWhere({ name: "LED" });

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
