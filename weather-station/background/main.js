let Wappsto = require("wapp-api");
let axios = require("axios");
let config = require("./config");
let networkInfo = require("./networkInfo.json");

let wappsto = new Wappsto({
  baseUrl: "https://wappsto.com/services",
  session: "68c355e7-d255-4f4c-b912-d35b12f709c7"
});

let network, data;
let unreacheableDevices = [];
// Timer used for updating data
let updateTimer;
// 3 min
let timeInterval = 180000;

let statusMessage = {
  warning_user_login:
    "Please login into your Netatmo account to grant permissions to this app",
  success_user_granted_netatmo_data_access: "Permission granted",
  error_user_denied_netatmo_data_access:
    "Permission to access Netatmo account data denied",
  success_retrieve_wappsto_data: "Succesfully retrieved Wappsto data",
  error_retrieve_wappsto_data: "Failed to retrieve Wappsto data"
};

wappsto.get(
  "data",
  {},
  {
    expand: 1,
    subscribe: true,
    success: function(collection) {
      data = collection.first();

      checkNetwork();
    },
    error: function(error) {
      console.log(error);
    }
  }
);

// Check if network exists; if not then create it
let checkNetwork = function() {
  wappsto.get(
    "network",
    {},
    {
      expand: 5,
      subscribe: true,
      success: function(collection) {
        if (collection.length > 0) {
          network = collection.first();

          setUpdateTimer();
        } else {
          network = createNetwork();
          // get the users station data with which to populate the network
          getStationData();
        }
      },
      error: function(error) {
        console.log(error);
      }
    }
  );
};

// Update station data
let updateStationData = function() {
  unreacheableDevices = [];
  // Remove previous unreacheable devices
  updateWappstoData({ lostDevices: unreacheableDevices });

  if (updateTimer) {
    clearInterval(updateTimer);
  }
  // Destroy existing network and then create new network using new data
  network
    .destroy()
    .catch(function(error) {
      // console.log(error);
    })
    .then(function() {
      network = createNetwork();

      getStationData();
    });
};

let setUpdateTimer = function() {
  updateTimer = setInterval(function() {
    updateStationData();
  }, timeInterval);
};

// Create and return network
let createNetwork = function() {
  let newNetwork = new wappsto.models.Network();

  newNetwork.set("name", networkInfo.name);

  return newNetwork;
};

// Create and return device
let createDevice = function(deviceData) {
  let newDevice = new wappsto.models.Device();
  // If a device is not reachable it will be skipped
  if (deviceData.reachable === false) {
    unreacheableDevices.push(deviceData.module_name);
    return null;
  }
  // Device type is used to differentiate between the Main Module and the other modules
  // Thus the right attributes can be set for each case
  if (deviceData.type === "NAMain") {
    newDevice.set({
      name: deviceData.module_name,
      description: networkInfo.device[0].description,
      manufacturer: networkInfo.device[0].manufacturer,
      communication: networkInfo.device[0].communication
    });
  } else {
    newDevice.set({
      name: deviceData.module_name,
      description: "Module device",
      manufacturer: networkInfo.device[0].manufacturer,
      communication: networkInfo.device[0].communication
    });
  }
  return newDevice;
};

// Create and return device value
let createValue = function(dataType, device) {
  let newValue = new wappsto.models.Value();

  networkInfo.device[0].value.forEach(function(value) {
    if (value.param === dataType) {
      newValue.set({
        name: value.name,
        type: value.type,
        permission: value.permission,
        dataType: value.dataType,
        // all the values are of type number
        number: {
          min: value.min ? parseInt(value.min) : -999,
          max: value.max ? parseInt(value.max) : 999,
          step: value.step ? parseInt(value.step) : 1,
          unit: value.unit
        },
        description: value.description
      });

      if (newValue) {
        // get the state data
        let stateData = device.dashboard_data[value.param];
        // all the value permissions are of type Report
        let reportState = createState("Report", stateData);

        newValue.get("state").push(reportState);
      }
    }
  });
  return newValue;
};

// Create and return value state
let createState = function(type, data) {
  let newState = new wappsto.models.State();

  let timestamp = new Date().toISOString();

  newState.set({
    type: type,
    data: data + "",
    timestamp: timestamp + ""
  });

  return newState;
};

// Save network and set update timer
let saveNetwork = function() {
  network.save(
    {},
    {
      subscribe: true,
      success: function() {
        if (updateTimer) {
          clearInterval(updateTimer);
        }

        setUpdateTimer();
      },
      error: function(error) {
        console.log(error);
      }
    }
  );
};

// Save and update data to wappsto data model
let updateWappstoData = function(dataToUpdate) {
  data.set(dataToUpdate);
  data.save(dataToUpdate, {
    patch: true
  });
};

// By default, axios serializes JavaScript objects to JSON.
// To send data in the application/x-www-form-urlencoded format instead, use querystring to stringify nested objects!
const querystring = require("querystring");

// Get access token with client credentials grant type - use only for development and testing
let getAccessToken = function() {
  axios({
    method: "POST",
    headers: {
      Host: "api.netatmo.com",
      "Content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    url: "/oauth2/token",
    baseURL: "https://api.netatmo.com/",
    data: querystring.stringify({
      grant_type: "password",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
      scope: "read_station"
    })
  })
    .then(function(response) {
      updateWappstoData({
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      });

      getStationData();
    })
    .catch(function(error) {
      console.log(error);
    });
};

// Send request to refresh token and update tokens with new values
let getRefreshToken = function() {
  let refreshToken = data.get("refreshToken");

  axios({
    method: "POST",
    headers: {
      Host: "api.netatmo.com",
      "Content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    url: "/oauth2/token",
    baseURL: "https://api.netatmo.com/",
    data: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    })
  })
    .then(function(response) {
      updateWappstoData({
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in
      });

      getStationData();
    })
    .catch(function(error) {
      console.log(error);
    });
};

// Use device data to create device, values and state and then add device to the network
let addDevicesToNetwork = function(deviceData) {
  deviceData.forEach(function(device) {
    let deviceToAdd = createDevice(device);

    if (deviceToAdd) {
      let deviceDataTypes = device.data_type;

      deviceDataTypes.forEach(function(dataType) {
        let valueToAdd = createValue(dataType, device);

        deviceToAdd.get("value").push(valueToAdd);
      });
      network.get("device").push(deviceToAdd);
    }
  });
};

// Get the users station data
let getStationData = function() {
  let accessToken = data.get("accessToken");

  if (!accessToken) {
    getAccessToken();
  }

  axios({
    method: "GET",
    headers: {
      Host: "api.netatmo.com",
      Authorization: "Bearer " + accessToken
    },
    url: "/getstationsdata",
    baseURL: "https://api.netatmo.com/api/",
    data: querystring.stringify({
      device_id: config.deviceId,
      get_favorites: false
    })
  })
    .then(function(response) {
      // Data of the Main Module - every station has this device
      let deviceData = response.data.body.devices;
      // Saving station name to display in the FG
      let stationName = deviceData[0].station_name;

      if (data.get("stationName") !== stationName) {
        updateWappstoData({ stationName: stationName });
      }

      addDevicesToNetwork(deviceData);
      // Data of the modules associated with the Main Module
      let moduleData = response.data.body.devices[0].modules;

      addDevicesToNetwork(moduleData);
      // Saving network
      saveNetwork();
      // Save unreachable devices if any
      if (unreacheableDevices.length > 0) {
        updateWappstoData({
          status_message: statusMessage.success_retrieve_wappsto_data,
          lostDevices: unreacheableDevices
        });
      } else {
        updateWappstoData({
          status_message: statusMessage.success_retrieve_wappsto_data
        });
      }
    })
    .catch(function(error) {
      updateWappstoData({
        status_message: statusMessage.error_retrieve_wappsto_data
      });

      getRefreshToken();
    });
};
