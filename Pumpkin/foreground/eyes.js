// get device
var eyes = network.get("device").findWhere({
  "name": pumpkinConfig.device.eyes.name
});

// get values
var redVal = eyes.get("value").findWhere({
  "name": pumpkinConfig.device.eyes.valueName_Red
});
var greenVal = eyes.get("value").findWhere({
  "name": pumpkinConfig.device.eyes.valueName_Green
});
var blueVal = eyes.get("value").findWhere({
  "name": pumpkinConfig.device.eyes.valueName_Blue
});

//get Report states
var redReport = redVal.get("state").findWhere({
  "type": "Report"
});
var greenReport = greenVal.get("state").findWhere({
  "type": "Report"
});
var blueReport = blueVal.get("state").findWhere({
  "type": "Report"
});

// util function to convert color values
function hexToRGB(color) {
  var hex = color.replace('#', '0x');
  var r = Math.round(hex >> 16).toString(),
    g = Math.round(hex >> 8 & 0xFF).toString(),
    b = Math.round(hex & 0xFF).toString();
  return rgb = {
    'r': r,
    'g': g,
    'b': b
  };
}
// util function to convert color values
function componentToHex(c) {
  var hex = parseInt(c, 10).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
// util function to convert color values
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function updateEyes() {
  // convert latest device value states to hex color value
  var eyeColor = rgbToHex(redReport.get("data"), greenReport.get("data"), blueReport.get("data"));

  // update DOM element with the new eye color
  $("input[type='color']").val(eyeColor);
}

function saveEyes(rgb) {
  // save device value data of the 'Control' states
  redVal.get("state").findWhere({
    "type": "Control"
  }).save({
    "data": rgb.r
  });
  greenVal.get("state").findWhere({
    "type": "Control"
  }).save({
    "data": rgb.g
  });
  blueVal.get("state").findWhere({
    "type": "Control"
  }).save({
    "data": rgb.b
  });
}

$(document).ready(function() {
  // call 'updateEyes' function to match DOM element with the device value state
  updateEyes();

  // cal 'saveEyes' function on the DOM element value change and pass converted color value
  $("input[type='color']").on("change", function() {
    $("input[type='color']").val($(this).val());
    var rgb = hexToRGB($(this).val());
    saveEyes(rgb);
  });
});

// listen to device value 'Report' state data changes
redReport.on("change:data", function() {
  // call 'updateEyes' function to match DOM element with the device value state
  updateEyes();
});

// listen to device value 'Report' state data changes
greenReport.on("change:data", function() {
  // call 'updateEyes' function to match DOM element with the device value state
  updateEyes();
});

// listen to device value 'Report' state data changes
blueReport.on("change:data", function() {
  // call 'updateEyes' function to match DOM element with the device value state
  updateEyes();
});
