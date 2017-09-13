load("jquery-2.1.1.js");
load("underscore-1.8.3.js");

//varaible initialization
//getData() gets application data to obtain Open Weather Map API key
var data = getData()[0];
var name = "Open Weather Map";
var baseUrl = "/external/openweathermap/data/2.5";
var appId;

//getModelsPrototype() is Wappsto function to create basic data structure
var models = getModelsPrototype();

//Waiting for the API key. Once its there the rest of the code is run.
//getNetwork() retrieves all of the app's Networks 
//If there is already a Device in this Network, then listen to if the stream sends a state change
//Else createNetwork(), call it 'Open Weather Map'. Note that this modifies the default Network model.
var network = getNetwork()[0];
var run = function(){
  appId = data.get("apiKey");
  if(data.get("apiKey")){
    if(network.get("device").length == 0){
      createNetwork(name);
    } else {
      addValueListeners(network);
    }
  }
}

data.on("change", function(){
  	run();
})

run();

//Calls open weather map API and retrieves a JSON object 
//then puts that format into Wappsto data model 
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
    var placeValue = createValue("place", place, "rw", "Control");

    var reportPlaceState = createState("Report", place);
    placeValue.get("state").add(reportPlaceState);

    device.get("value").push(placeValue);

    network.get("device").push(device);
    _.each(weather, function(val, name){
      var value = createValue(name, val, "r", "Report", true);
      device.get("value").push(value);
    });
    //if network exists, update, or else creates a network
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

//creates a device specifically for open weather map
function createDevice(){
  var device = new models["Device"]();
  device.set("name", "weather main");
  device.set("manufacturer", "Open Weather Map");
  device.set("communication", "always");
  return device;
}

//creates value for open weather map Device, used to create value for each weather attribute from open weather map
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

//creates the States for each Value created under the Device for open weather map
function createState(dataType, data){
  var state = new models["State"]();
  state.set("type", dataType);
  state.set("data", data+"");
  var timestamp = new Date().toISOString();
  state.set("timestamp", timestamp+"");
  return state;
}

//if the place changes, send new request to Open Weather Map
function addValueListeners(network){
  var value = network.get("device").findWhere({"name": "weather main"}).get("value").findWhere({name: "place"});
  var controlState = value.get("state").findWhere({"type":"Control"});
  if(controlState){
    controlState.off("stream:data", null, "weather converter");
    controlState.on("stream:data", function(data){
      if(data.data != controlState.get("data")){
        data = data.data;
      	sendRequest(network, data);
      }
    }, "weather converter");
  }
}


function sendRequest(network, place){
      var device = network.get("device").findWhere({"name": "weather main"});
      var placeValueForModification = device.get("value").findWhere({"type":"place"});
      var reportPlaceState = placeValueForModification.get("state").findWhere({"type": "Report"});
      var controlPlaceState = placeValueForModification.get("state").findWhere({"type": "Control"});
  
  console.log("sending city: "+place);
   reportPlaceState.save({"status": "Pending"}, {wait: true});
  $.ajax({url: baseUrl+"/weather?q="+place+"&APPID="+ appId,
          method: "GET",
          headers: {
            'Content-type': 'application/json',
            'Accept': 'application/json',
            'X-Session': sessionID }
         })
    .done(function(data){
    
    
    if(device){

      var reportPlaceFromOWM = data["name"];
      
      var timestamp = new Date().toISOString();
      reportPlaceState.set({data: reportPlaceFromOWM, type: "Report", timestamp: timestamp+""});
      controlPlaceState.set({data: place, type: "Control", timestamp: timestamp+""});
      
      reportPlaceState.set("status", "Send");
      
      
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
        //set placeValue status to error
        //placeValueForModification.set("status", "error");
        console.log("failed to save device info");
      }})
    }
  })
    .fail(function(error){
   	var device = network.get("device").findWhere({"name": "weather main"});
    var placeStateForModification = device.get("value").findWhere({"type":"place"}).get("state").findWhere({"type": "Report"});
    placeStateForModification.set("status", "Failed");
    placeStateForModification.save();
    console.log("failed to get weather of "+place);
  });
}
