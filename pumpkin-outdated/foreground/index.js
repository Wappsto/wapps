// load utility functions
let wappsto = new Wappsto();

var network;

// getNetwork function creates a permission request for a network with the name specified in pumpkinConfig.js
wappsto.get("network", { name: pumpkinConfig.network.name }, {
  expand: 5,
  quantity: 1,
  message: "Trick or treat?"
  subscribe: true,
  success: (collection, response, XHRResponse) => {
    network = collection.first();
    loadPumpkinEyesFile();
    loadPumpkinNoseFile();
    loadPumpkinMouthFile();
    loadPumpkinTemperatureFile();
  }
});

// 'message' in the object will be shown to the user when requesting Network

//load pupmkin component functionality

function loadPumpkinEyesFile() {
  var imported = document.createElement("script");
  imported.src = "./eyes.js";
  document.head.appendChild(imported);
}
function loadPumpkinNoseFile() {
  var imported = document.createElement("script");
  imported.src = "./nose.js";
  document.head.appendChild(imported);
}
function loadPumpkinMouthFile() {
  var imported = document.createElement("script");
  imported.src = "./mouth.js";
  document.head.appendChild(imported);
}
function loadPumpkinTemperatureFile() {
  var imported = document.createElement("script");
  imported.src = "./temperature.js";
  document.head.appendChild(imported);
}
