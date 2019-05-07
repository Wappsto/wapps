// get device
var temperature = network.get("device").findWhere({
  "name": pumpkinConfig.device.temperature.name
});

// get value
var tempVal = temperature.get("value").findWhere({
  "name": pumpkinConfig.device.temperature.valueName
});

// get Report state
var tempReport = tempVal.get("state").findWhere({
  "type": "Report"
});

function updateTemp(){
  // update DOM element with the device state data
  $("#hotnessLevel").html(tempReport.get("data"));
}

$(document).ready(function () {
  // update DOM element when page is loaded
  updateTemp();
});

// listen to device value 'Report' state data changes
tempReport.on("change:data", function () {
  updateTemp();
});
