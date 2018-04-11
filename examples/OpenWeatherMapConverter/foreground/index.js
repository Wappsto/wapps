load("style.css");
var networkInfo = $.parseJSON(getFileContent("networkInfo.json")), // network info oject provides names and value descriptions, which are used in model creation and UI
    network = getNetwork()[0];

load("currentWeather.js"); // loading current weather listeners.

$(document).ready(function () {
  var statusPanel = $("#status"),
      statusMessage = $("#statusMessage"),
      valueListElm = $("#integratedValues"),
      valueList = createValueDescription;
  $("#networkName").text(networkInfo.name); // setting network name
  valueListElm.html(valueList); // creating value list based on networkInfo object
});

function updateStatusMessage(status) {
  statusPanel.show().addClass(status.type);
  statusMessage.text(status.message);
  setTimeout(function(){ statusPanel.hide(); }, 4000);
}

function createValueDescription(){
  var list = "",
      unit = "";
  $.each(networkInfo.device[0].value, function(key, value) {
    if(value.unit){
      unit = "(" + value.unit + ")";
    } else if (value.encoding){
      unit = "(" + value.encoding + ")";
    }
    list += "<li><strong>" + value.name + "</strong> " + unit + " - " + value.description + "</li>";
  });
  return list;
}
