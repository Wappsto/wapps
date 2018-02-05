load("jquery-2.1.1.js"); // loading jQuery lib
load("underscore-1.8.3.js"); // loading underscore lib
load("style.css"); // loading stylesheets
load("apiKey.js"); // loading api key handling functions

var networkInfo = $.parseJSON(getFileContent("networkInfo.json")), // network info oject provides names and value descriptions, which are used in model creation and UI
	network = getNetwork()[0],
	statusPanel = $("#status"),
	statusMessage = $("#statusMessage"),
    valueListElm = $("#integratedValues"),
    valueList = createValueDescription;

load("currentWeather.js"); // loading current weather listeners.

$("#networkName").text(networkInfo.name); // setting network name
valueListElm.html(valueList); // creating value list based on networkInfo object

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
