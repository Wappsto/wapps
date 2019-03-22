let wappsto = new Wappsto();
let device, city;

getDevice();

$(document).ready(function () {
  $("#networkName").text(networkInfo.name);
  $("#integratedValues").html(createValueDescription);
});

function updateStatusMessage(status) {
  $("#status").show().addClass(status.type);
  console.log(status);
  $("#statusMessage").html(status.message);
  setTimeout(function(){ $("#status").hide(); }, 4000);
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


// creating event listener that makes requests on city change
function addValueListener() {
  console.log("add listener for device");
  var townReportState = device.get("value").findWhere({name:"city"}).get("state").findWhere({type:"Report"});
  townReportState.on("change", function(model, data){
    $("#currentWeather").html(currentValueList());
  });
}

function setCurrentLocation(){
  var name = $("#currentLocation").val();
  if(name){
    if(device){
      var timestamp = new Date().toISOString();
      var	controlState = device.get("value").findWhere({"name": "city"}).get("state").findWhere({"type":"Control"});
      controlState.save({
        "data": name,
        "timestamp": timestamp + ""
      }, {
        patch: true,
        error: function(){
          console.log("An error occured when sending requesting data.");
        }
      });
    } else {
      updateStatusMessage({message:"Something went wrong. Please try again.", type:"error"});
      getDevice();
    }
  } else{
    updateStatusMessage({message:"enter city name", type:"error"});
  }
}

function getDevice(){
  wappsto.get('device', {name: "Current Weather"}, {
    expand: 5,
    subscribe: true,
    success: (deviceCollection) => {
      device = deviceCollection.first();
      if (device && device.get('value') && device.get('value').length !== 0) {
        $("#currentWeather").html(currentValueList());
        addValueListener();
      } else {
        updateStatusMessage({
          type: "error",
          message: "Network Was not created. Please accept permission."
        });
        wappsto.wStream.subscribe("/network");
        wappsto.wStream.on("message", event => {
          try{
            message = JSON.parse(event.data);
            message.forEach(m => {
              if(m.meta_object.type === "network" && m.event === "create"){
                getDevice();
              }
            });
          }catch(e){
            console.log(e);
          }
        });
      }
    },
    error: (networkCollection, response) => {
      updateStatusMessage({
        type: "error",
        message: "Network Was not created. Please accept permission."
      });
    }
  });
}
function currentValueList(){
  var list = "",
      data = "";
  $.each(device.get("value").models, function(key, value) {
    var unit = "";
    if(value.get("number")){
      unit = value.get("number").unit;
    }
    data = value.get("state").findWhere({"type":"Report"}).get("data");
    if(value.get("type") === "timestamp"){
      var timestamp = data;
      data = new Date(0);
      data.setUTCSeconds(timestamp);
    }
    list += "<li>" + value.get("name") + ": <strong id='"+value.get("name")+"Data'>" + data + "</strong> " + unit + "</li>";
  });
  return list;
}