// Functions used in the conversion process

// Create and return a network with the name Fitbit
const createNetwork = wappstoInstance => {
  if (wappstoInstance) {
    let newNetwork = new wappstoInstance.models.Network();
    newNetwork.set("name", "Fitbit");
    return newNetwork;
  }
  return null;
};

// Create and return a device
const createDevice = (wappstoInstance, deviceType) => {
  if (wappstoInstance && deviceType) {
    let newDevice = new wappstoInstance.models.Device();
    switch (deviceType.toLowerCase()) {
      case "dashboard":
        newDevice.set("name", "Dashboard");
        break;
      case "sleep stage":
        newDevice.set("name", "Sleep stage");
        break;
    }
    newDevice.set("manufacturer", "Fitbit Converter");
    return newDevice;
  }
  return null;
};

// Create and return a value based on its value type
const createValue = (wappstoInstance, valueType, valueData) => {
  if (wappstoInstance && valueType && valueData) {
    let newValue = new wappstoInstance.models.Value();
    let stateData, reportState;
    switch (valueType.toLowerCase()) {
      case "calories":
        newValue.set("name", "Calories burned");
        newValue.set("type", "energy");
        newValue.set("permission", "r");
        newValue.set("status", "ok");
        newValue.set("number", {
          max: 4000,
          min: 0,
          step: 1,
          unit: "cal"
        });
        stateData = valueData.summary.calories ? valueData.summary.calories : "0";
        reportState = createState(wappstoInstance, "Report", stateData);
        break;
      case "floors":
        newValue.set("name", "Floors");
        newValue.set("type", "count");
        newValue.set("permission", "r");
        newValue.set("status", "ok");
        newValue.set("number", {
          max: 1000,
          min: 0,
          step: 1,
          unit: ""
        });
        stateData = valueData.summary.floors ? valueData.summary.floors : "0";
        reportState = createState(wappstoInstance, "Report", stateData);
        break;
      case "heart rate":
        newValue.set("name", "Resting heart rate");
        newValue.set("type", "frequency");
        newValue.set("permission", "r");
        newValue.set("status", "ok");
        newValue.set("number", {
          max: 250,
          min: 30,
          step: 1,
          unit: "bpm"
        });
        stateData = valueData.summary.restingHeartRate;
        reportState = createState(wappstoInstance, "Report", stateData);
        break;
      case "sleep":
        let name = valueData.level;
        newValue.set("name", name === "rem" ? name.toUpperCase() : name.replace(/^./, name[0].toUpperCase()));
        newValue.set("type", "time");
        newValue.set("permission", "r");
        newValue.set("status", "ok");
        newValue.set("string", {
          encoding: "",
          max: 100000
        });
        stateData = valueData.dateTime ? valueData.dateTime : "0";
        reportState = createState(wappstoInstance, "Report", stateData);
        break;
      case "steps":
        newValue.set("name", "Steps");
        newValue.set("type", "count");
        newValue.set("permission", "r");
        newValue.set("status", "ok");
        newValue.set("number", {
          max: 100000,
          min: 0,
          step: 1,
          unit: ""
        });
        stateData = valueData.summary.steps;
        reportState = createState(wappstoInstance, "Report", stateData);
        break;
      case "water":
        newValue.set("name", "Water");
        newValue.set("type", valueType);
        newValue.set("permission", "r");
        newValue.set("status", "ok");
        newValue.set("number", {
          max: 100000,
          min: 0,
          step: 1,
          unit: "litre"
        });
        stateData = valueData.length > 0 ? valueData.summary.water : "0";
        reportState = createState(wappstoInstance, "Report", stateData);
        break;
    }
    newValue.get("state").push(reportState);
    return newValue;
  }
  return null;
};

// Create and return a state
const createState = (wappstoInstance, stateType, data) => {
  if (wappstoInstance && stateType && data) {
    let newState = new wappstoInstance.models.State();

    let timestamp = new Date().toISOString();

    newState.set("type", stateType);
    newState.set("data", data.toString());
    newState.set("timestamp", timestamp);

    return newState;
  }
  return null;
};

module.exports = {
  createNetwork: createNetwork,
  createDevice: createDevice,
  createValue: createValue,
  createState: createState
};
