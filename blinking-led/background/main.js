/* Note that some of this code is repeated from the foreground js file. Common instantiation of objects between the foreground and background is on the road map. */
const Wappsto = require('wapp-api');
let wappsto = new Wappsto();
let wappstoConsole = require("wapp-api/console");
wappstoConsole.start();
let blinking,
    data,
    led,
    ledControlState;


wappsto.get("device", {"name": "Light"}, {
  "quantity": "1",
  "expand": 5,
  "success": (collection, response) => {
    if(collection.length === 1){
      led = collection.first();
      ledControlState = led.get("value").findWhere({name: "LED"}).get("state").findWhere({type: "Control"});

    }
  }
});

wappsto.get("data", {}, {
  "expand": 5,
  "subscribe":true,
  "success": (collection, response) => {
    data = collection.first();
    console.log(data);
    data.on("change:blink", function() {
      console.log("Data changed");
      /* Here's the actual functionality */
      if (data.get("blink")) {
        blink();
      } else {
        stopBlinking();
      }
    });
  }
});

function blink() {
  console.log("blink");
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
