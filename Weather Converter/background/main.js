load("jquery-2.1.1.js");
//varaible initialization

var data = getData()[0]; //getData() gets application data to obtain Open Weather Map API key
var baseUrl = "/external/openweathermap/data/2.5";
var appId, timer;
var networkInfo = $.parseJSON(getFileContent("networkInfo.json")); //network info oject provides names and value descriptions, which are used in model creation and UI
//getModelsPrototype() is Wappsto function to create basic data structure
var models = getModelsPrototype();
//Waiting for the API key. Once its there the rest of the code is run.
//getNetwork() retrieves all of the app's Networks
//If there is already a Device in this Network, then listen to if the stream sends a state change
//Else createNetwork(), call it 'Open Weather Map'. Note that this modifies the default Network model.
var network = getNetwork()[0];
var run = function() {
  if(data.get("apiKey")){
    appId = data.get("apiKey");
  } else{
  //  appId = "Insert your apiKey (appID) here";
  }
  if(network.get("device").length == 0) {
    createNetwork();
  } else {
    addValueListeners(network);
  }
}

data.on("change", function() {
  run();
})

run();

// Following function calls Open Weather Map API and retrieves a JSON object. Afterwards maps retrieved data to Wappsto data model
function createNetwork() {
  network.set("name", networkInfo.name);
  var place = "Aalborg";
  $.ajax({
    url: baseUrl + "/weather?q=" + place + "&APPID=" + appId,
    method: "GET",
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json',
      'X-Session': sessionID
    }
  }).done(function(data) {
    var device = createDevice(data);
    $.each(networkInfo.device[0].value, function(key, value) {
      var newValue = createValue(data, value);
      device.get("value").push(newValue);
    });
    network.get("device").push(device);
    addNetwork(network, {
      success: function() {
        addValueListeners(network);
      },
      error: function() {
        console.log("Failed to create network.");
      },
      create: true
    });
  }).fail(function(error) {
    console.log("Failed to create network ==> failed to get data for place: " + place);
  });
}
//creates a device based on data model
function createDevice(data) {
  var device = new models["Device"](),
      deviceData = networkInfo.device[0];

  $.each(deviceData, function(key, value) {
    if (key !== "value") {
      device.set(key, value);
    }
  });

  return device;
}
//creates value for open weather map Device, used to create value for each weather attribute from open weather map
function createValue(data, valInfo) {
  var value = new models["Value"](),
      param = valInfo.param.split(".");

  if (param.length > 1) {
    data = data[param[0]][param[1]];
  } else {
    data = data[param[0]];
  }

  value.set("name", valInfo.name);
  value.set("dataType", valInfo.dataType);
  value.set("type", valInfo.type);
  value.set("permission", valInfo.permission);
  if (valInfo.dataType === "number") {
    value.set("number", {
      "min": valInfo.min | -999,
      "max": valInfo.max | 999,
      "step": valInfo.step | 1,
      "unit": valInfo.unit
    });
  } else if (valInfo.dataType === "string") {
    value.set("string", {
      "max": valInfo.max | 99,
      "encoding": valInfo.encoding
    });
  }

  switch (valInfo.permission) {
    case "r":
      var reportState = createState("Report", data);
      value.get("state").push(reportState);
      break;
    case "w":
      var controlState = createState("Control", data);
      value.get("state").push(controlState);
      break;
    case "rw":
    case "wr":
      var reportState = createState("Report", data);
      var controlState = createState("Control", data);
      value.get("state").push([reportState, controlState]);
      break;
    default:
      return "";
  }

  return value;
}

//creates the States for each Value based on its permission
function createState(dataType, data) {
  var state = new models["State"](),
      timestamp = new Date().toISOString();

  state.set("type", dataType);
  state.set("data", data + "");
  state.set("timestamp", timestamp + "");

  return state;
}

//if the place changes, send new request to Open Weather Map
function addValueListeners(network) {
  var value = network.get("device").findWhere({
    "name": networkInfo.device[0].name
  }).get("value").findWhere({
    name: "city"
  });
  var controlState = value.get("state").findWhere({
    "type": "Control"
  });
  if (controlState) {
    controlState.off("stream:data", null, "OpenWeatherMap Converter");
    controlState.on("stream:data", function(data) {
      if(data.timestamp != controlState.get("timestamp")){
        data = data.data;
        sendRequest(network, data, value);
        if(timer){
          clearInterval(timer);
        }
        timer = setInterval(function(){
          sendRequest(network, data, value);
        }, 900000);
      }
    }, "OpenWeatherMap Converter");
    if(!timer){
      timer = setInterval(function(){
        sendRequest(network, controlState.get("data"), value);
      }, 900000);
    }
  }
}

function sendRequest(network, location, value) {
  var device = network.get("device").findWhere({"name": networkInfo.device[0].name});
  var reportState = value.get("state").findWhere({"type": "Report"});
  var controlState = value.get("state").findWhere({"type": "Control"});
  console.log("Sending city: " + location);
  reportState.save({"status": "Pending"}, {wait: true});
  $.ajax({
    url: baseUrl + "/weather?q=" + location + "&APPID=" + appId,
    method: "GET",
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json',
      'X-Session': sessionID
    }
  }).done(function(data) {
    if(device) {
      var timestamp = new Date().toISOString();
      reportState.set("status", "Send");

      $.each(networkInfo.device[0].value, function(key, val) {
        var state = device.get("value").findWhere({"name": val.name}).get("state").findWhere({"type":"Report"}),
          newData = "",
          param = val.param.split(".");
        if (param.length > 1) {
          newData = data[param[0]][param[1]];
        } else {
          newData = data[param[0]];
        }
        state.set({
          "data": newData + "",
          "timestamp": timestamp + ""
        });
      });
      device.save({}, {
        wait: true,
        error: function() {
          reportState.set("status", "Failed");
          console.log("Failed to save device info.");
        }
      })
    }
  }).fail(function(error) {
    reportState.save({"status": "Failed"}, {wait: true});
    console.log("Failed to get weather for " + location);
  });
}
