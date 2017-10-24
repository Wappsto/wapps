// load utility functions, styling and name cofiguration
load("jquery.min.js");
load("pumpkinConfig.js");
load("pumpkin.css");
load("face.css");

// getNetwork function creates a permission request for a network with the name specified in pumpkinConfig.js
var network = getNetwork({
  "name": pumpkinConfig.network.name
}, {
  "message": "Trick or treat?"
})[0]; 

//load pupmkin component functionality
load("eyes.js");
load("nose.js");
load("mouth.js");
load("temperature.js");
