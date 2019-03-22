let Wappsto = require("wapp-api");
let wappsto = new Wappsto();
let wappstoConsole = require("wapp-api/console");
wappstoConsole.start(); // to start sending logs
let network;
var timer;
var timeInterval = 60000;

console.log("Starting Smart Home");

const networkInfo = require("./homeInfo.json");

wappsto.get(
  "network", {}, {
    expand: 4,
    success: networkCollection => {
      network = networkCollection.first();
      if (network && network.get("device").length !== 0) {
        console.log("I already have a network, no need to create ", network);
        createData();
        if(timer){
          clearInterval(timer);
        }
        timer = setInterval(function(){
          console.log("This is interval on the existing network");
          createData();
        }, timeInterval);
      } else {
        createNetwork();
      }
    },
    error: (networkCollection, response) => {
      console.log(response);
      createNetwork();
    }
  }
);

function createNetwork() {
  network = new wappsto.models.Network();
  network.set("name", networkInfo.name);

  var device = createDevice();
  networkInfo.device[0].value.forEach(function(value, index) {
    var newValue = createValue(value);
    device.get("value").push(newValue);
  });
  network.get("device").push(device);
  saveNetwork(network);
}

function createDevice(data) {
  var device = new wappsto.models.Device();
  var deviceData = Object.assign({}, networkInfo.device[0]);
  delete deviceData.value;
  device.set(deviceData);

  return device;
}

function createValue(valInfo) {
  var value = new wappsto.models.Value();
  var reportState, controlState, data;

  value.set("name", valInfo.name);
  value.set("dataType", valInfo.dataType);
  value.set("type", valInfo.type);
  value.set("permission", valInfo.permission);
  if (valInfo.dataType === "number") {
    value.set("number", {
      min: valInfo.number.min,
      max: valInfo.number.max,
      step: valInfo.number.step | 1,
      unit: valInfo.number.unit
    });
  } else if (valInfo.dataType === "string") {
    value.set("string", {
      max: valInfo.string.max | 99,
      encoding: valInfo.string.encoding
    });
  }

  data = valInfo.data;

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
      if(timer){
        clearInterval(timer);
      }
      timer = setInterval(function(){
        console.log("This is interval on the new network");
        createData();
      }, timeInterval);
    },
    error: function(model, response) {
      if (response.responseJSON.code === 400013) {
        console.log("you do not have the permission to create the network");
      } else {
        console.log(response.responseJSON);
      }
    }
  });
}


function createData() {
  network.get("device").forEach(function(device){
    device.get("value").forEach(function(value){
      var reportState = value.get("state").findWhere({type: "Report"});
      var currentData = Number(reportState.get("data"));
      var number = value.get("number");
      var newData;
      var range;
      var plusOrMinus;

      if (currentData < number.min) {
        plusOrMinus = 1;
      } else if (currentData > number.max) {
        plusOrMinus = -1;
      } else {
        plusOrMinus = Math.pow(-1, Math.random() < 0.5 ? 0 : 1);
      }

      switch (value.get("type")) {
        case "temperature":
          range = {"min": 0, "max": 1};
          break;
        case "humidity":
          range = {"min": 1, "max": 5};
          break;
        case "co2":
          range = {"min": 10, "max": 200};
          break;
        default:
          range = {"min": 1, "max": 2};
      }
      if(isNaN(currentData)){
        currentData = 0;
      }
      newData = currentData + plusOrMinus * Math.floor(Math.random() * (range.max - range.min) + range.min);

      var attr = {
        timestamp: new Date().toISOString(),
        data: newData+"",
        status: "Send"
      };

      reportState.save(attr, {
        patch:true,
        success:function(){
          console.log("Updated " + value.get("name") + " with " + newData);
        },
        error: function(model, response) {
          console.error("Failed to update data", response);
        }
      });
    });
  });
}
