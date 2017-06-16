load("jquery-2.1.1.js");
load("underscore-1.8.3.js");

var baseUrl = "/external/openweathermap/data/2.5";
var appId = "77e9d318c61394bd371e812f1ccaa997";

var models = getModelsPrototype();
var name = "Open Weather Map";
var network = getNetwork()[0];
if(network.get("device").length == 0){
  createNetwork(name);
} else {
  addValueListeners(network);
}

function createNetwork(name){
  network.set("name", name);
  var place = "Berlin";
  $.ajax({url: baseUrl+"/weather?q="+place+"&APPID="+ appId,
          method: "GET",
          headers: {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            'X-Session': sessionID }
         })
    .done(function(data){
    var weather = data["main"];
    var device = createDevice();
    var placeValue = createValue("place", place, "w", "Control");
    device.get("value").push(placeValue);
    network.get("device").push(device);
    _.each(weather, function(val, name){
      var value = createValue(name, val, "r", "Report", true);
      device.get("value").push(value);
    });
    addNetwork(network, {
      success: function(){
        addValueListeners(network);
      },
      error: function(){
        console.log("failed to create network");
      },
      create: true
    });
  })
    .fail(function(error){
    console.log("failed to create network ==> failed to get data for place: "+place);
  });
}

function createDevice(){
  var device = new models["Device"]();
  device.set("name", "weather main");
  device.set("manufacturer", "Open Weather Map");
  device.set("communication", "always");
  return device;
}

function createValue(name, val, permission, stateType, typeNumber){
  var value = new models["Value"]();
  var type = (name == "temp") ? "Temperature" : name;
  value.set("name", name);
  value.set("type", type);
  if(typeNumber){
    value.set("number", {min: 0, max: 99999, step: 1, unit: "int"});
  } else {
    value.set("string", {max: 99});
  }
  value.set("permission", permission);
  var reportState = createState(stateType, val);
  value.get("state").push(reportState);
  return value;
}

function createState(dataType, data){
  var state = new models["State"]();
  state.set("type", dataType);
  state.set("data", data+"");
  var timestamp = new Date().toISOString();
  state.set("timestamp", timestamp+"");
  return state;
}

function addValueListeners(network){
  var value = network.get("device").findWhere({"name": "weather main"}).get("value").findWhere({name: "place"});
  var controlState = value.get("state").first();
  if(controlState){
    controlState.on("stream:data", function(data){
      data = data.data;
      sendRequest(network, data);
    });
  }
}

function sendRequest(network, place){
  console.log("sending "+place);

  $.ajax({url: baseUrl+"/weather?q="+place+"&APPID="+ appId,
          method: "GET",
          headers: {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            'X-Session': sessionID }
         })
    .done(function(data){
    var device = network.get("device").findWhere({"name": "weather main"});
    if(device){
      _.each(data["main"], function(value, key){
        var valueModel = device.get("value").findWhere({"name": key});
        if(valueModel){
          var reportState = valueModel.get("state").findWhere({"type": "Report"});
          if(reportState){
            var timestamp = new Date().toISOString();
            reportState.set({data: value+"", type: "Report", timestamp: timestamp+""});
          }
        }
      });
      device.save({}, {wait: true, error: function(){
        console.log("failed to save device info");
      }})
    }
  })
    .fail(function(error){
    console.log("failed to get weather of "+place);
  });
}
