const Wappsto = require("wapp-api");
let wappstoConsole = require("wapp-api/console");
let wappsto = new Wappsto();
let axios = require("axios");
const util = require('util');
const networkInfo = require("./networkInfo.json");
let appId = "0b27a0aaaa4ab868069b7754b008a8e1";
let network;
var timer;
var timeInterval= 900000;

wappstoConsole.start();

axios.defaults.headers = {
  "Content-type": "application/json",
  Accept: "application/json",
  "X-Session": process.env.sessionID
};

wappsto.get(
  "network", {}, {
    expand: 4,
    subscribe: true,
    success: networkCollection => {
      network = networkCollection.first();
      if (network && network.get("device").length !== 0) {
        addValueListeners(network);
      } else {
        createNetwork();
      }
    },
    error: (networkCollection, response) => {
      createNetwork();
    }
  }
);

function createNetwork() {
  network = new wappsto.models.Network();
  network.set("name", networkInfo.name);
  let place = "Copenhagen";
  axios(
    "http://rest-service/external/openweathermap/data/2.5/weather?q=" + place + "&units=metric&APPID=" + appId )
    .then(function({ data }) {
    // once request is successful, creating network devices with the data returned by the service
    var device = createDevice();
    // creating values based on meta description
    networkInfo.device[0].value.forEach(function(value, index) {
      var newValue = createValue(data, value);
      // adding values to the device
      device.get("value").push(newValue);
    });
    // adding device to the network
    network.get("device").push(device);

    // adding network to Wappsto
    saveNetwork(network);
  })
    .catch(function(error) {
    console.log(error);
    console.log("Failed to create network ==> failed to get data for place: " + place + ".");
  });
}

// creates a device based on Wappsto Data Model and metadata set in networkInfo object
function createDevice(data) {
  var device = new wappsto.models.Device();

  var deviceData = Object.assign({}, networkInfo.device[0]);

  // do not add values, we will handle that later
  delete deviceData.value;

  device.set(deviceData);

  return device;
}

// creates a value based on Wappsto Data Model and metadata set in networkInfo object

function createValue(data, valInfo) {
  var value = new wappsto.models.Value();
  var param = valInfo.param.split(".");
  var reportState, controlState;
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
      min: valInfo.min | -999,
      max: valInfo.max | 999,
      step: valInfo.step | 1,
      unit: valInfo.unit
    });
  } else if (valInfo.dataType === "string") {
    value.set("string", {
      max: valInfo.max | 99,
      encoding: valInfo.encoding
    });
  }
  // creating states for each Value based on its permission
  switch (valInfo.permission) {
    case "r":
      reportState = createState("Report", data);
      value.get("state").push(reportState);
      break;
    case "w":
      controlState = createState("Control", data);
      value.get("state").push(controlState);
      break;
    case "rw":
    case "wr":
      reportState = createState("Report", data);
      controlState = createState("Control", data);
      value.get("state").push([reportState, controlState]);
      break;
    default:
      return "";
  }

  return value;
}


function createState(dataType, data) {
  var state = new wappsto.models.State();

  var timestamp = new Date().toISOString();

  state.set("type", dataType);
  state.set("data", data + "");
  state.set("timestamp", timestamp + "");

  return state;
}

function saveNetwork() {
  network.save({}, {
    subscribe: true,
    success: function() {
      addValueListeners(network);
    },
    error: function(model, response) {
      if (response.responseJSON.code === 400013) {
        console.log("you do not have the permission to create the network");
      } else {
        console.log("Failed to create network.");
      }
    }
  });
}

function addValueListeners(network) {
  var value = network.get("device").findWhere({name: networkInfo.device[0].name}).get("value").findWhere({name: "city"});
  var controlState = value.get("state").findWhere({type: "Control"});

  if (controlState) {
    controlState.removeAllListeners("stream:message");
    controlState.on("stream:message", function(state, data) {
      if (data.timestamp !== controlState.get("timestamp")) {
        data = data.data;
        sendRequest(network, data, value);
        if(timer){
          clearInterval(timer);
        }
        timer = setInterval(function(){
          sendRequest(network, data, value);
        }, timeInterval);
      }
    });
    if(!timer){
      timer = setInterval(function(){
        sendRequest(network, controlState.get("data"), value);
      }, timeInterval);
    }
  }
}

function sendRequest(network, location, value) {
  var device = network.get("device").findWhere({ name: networkInfo.device[0].name });
  var reportState = value.get("state").findWhere({ type: "Report" });

  console.log("Sending city: " + location);

  reportState.save({ status: "Pending" }, { patch: true });

  axios("http://rest-service/external/openweathermap/data/2.5/weather?q=" + location + "&APPID=" + appId + "&units=metric")
    .then(function({ data }) {
    var timestamp = new Date().toISOString();
    networkInfo.device[0].value.forEach(function(val) {
      var state = device.get("value").findWhere({ name: val.name }).get("state").findWhere({ type: "Report" });
      var newData = "";
      var param = val.param.split(".");
      if (param.length > 1) {
        newData = data[param[0]][param[1]];
      } else {
        newData = data[param[0]];
      }
      state.save({
        data: newData + "",
        timestamp: timestamp + "",
        status: "Send"
      },{
        patch: true,
        error: function(error) {
          console.log(error.data);
          console.log("Failed to save value state " + val.name);
        }
      });
    });
  })
    .catch(function(error) {
    reportState.save({ status: "Failed" }, { patch: true });
    console.log("Failed to get weather for " + location + ".");
  });
}
