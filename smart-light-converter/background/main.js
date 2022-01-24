// Philips Hue remote API configuration
var clientId = "your_meethue_clientid";
var clientSecret = "your_meethue_clientsecret";

//******************************************************
//**  START set ajax content-type  and configuration  **
//******************************************************
var axios = require("axios");
var base64 = require("base-64");
var Wappsto = require("wapp-api");
var wappsto = new Wappsto();
let wappstoConsole = require("wapp-api/console");
wappstoConsole.start();
var wStream;
var networkRepliers;

var dataPromise = new Promise(function(resolve, reject) {
  wappsto.get("data", {}, {
    expand: 1,
    subscribe: true,
    success: function(col) {
      let data = col.first();
      wStream = wappsto.wStream;
      wStream.subscribe('/extsync');
      resolve(data);
    },
    error: function() {

    }
  });
});

var networkPromise = new Promise(function(resolve, reject) {
  networkRepliers = {
    resolve,
    reject
  };
  initializeNetwork();
});

Promise.all([dataPromise, networkPromise]).then(function(result) {
  console.log("STARTING THE APP");
  let data = result[0];
  let network = result[1];
  start(data, network);
});

function initializeNetwork() {
  wappsto.get("network", {}, {
    expand: 5,
    subscribe: true,
    success: function(col) {
      if (col.length > 0) {
        networkRepliers.resolve(col.first());
      } else {
        createNetwork();
      }
    },
    error: function() {
		    console.log("error getting network");
    }
  });
}

function createNetwork() {
  let network = new wappsto.models.Network({
    name: "hue network"
  });
  network.save({}, {
    subscribe: true,
    success: function() {
      networkRepliers.resolve(network);
    },
    error: function() {

    }
  });
}

function start(data, network) {
  var statusMessage = {
    "error_create_token": "Failed to create access token",
    "error_get_bridge_data": "Failed to get Hue Bridge data.",
    "error_create_config": "Failed to create configuration.",
    "error_create_user": "Failed to log in.",
    "success_update_wappsto_data": "Success! Hue Bridge was updated in Wappsto",
    "error_update_wappsto_data": "Failed to update Wappsto data.",
    "error_get_bridge_config": "Failed to get Bridge configuration.",
    "please_login": "Please log in.",
    "no_permission": "Requires permission to enable webhook and create data.",
    "logging_in": "Logging in...",
    "processing": "Processing..."
  };

  //** the uniqueID should be something like gatewayId or serial number, something unique that you get from the user  **
  var username = data.get("username");
  var bridgeId = data.get("bridgeId");
  var token = data.get("token") && data.get("token").access_token;
  //** refresh variable to know when we receive a stream if we should refresh background or not **
  var refresh = data.get("refresh");

  //** adding bridgeId and token listeners**
  data.on("stream:message", function(model, newData) {
    if (refresh != newData.refresh) {
      console.log("refreshing");
      refresh = newData.refresh;
      switch (appState) {
        case "processing":
        case "getting_token":
          updateData({
            "status": statusMessage.processing
          });
          break;
        case "error_login":
          updateData({
            "status": statusMessage.please_login
          });
          break;
        case "error_refresh_token":
          refreshToken();
          break;
        default:
          validateAndCreate();
          break;
      }
    }
  });

  //** baseUrl is the SERVICE that you are going to use for external requests (proxy thing, ask Tsvetomir) **
  var baseUrl = "http://rest-service/external/meethue/";
  var hueHeader = {
    'Content-type': 'application/json',
    'Accept': 'application/json',
    'X-Session': process.env.sessionID
  };
  axios.defaults.headers = {
    'Content-type': 'application/json',
    'Accept': 'application/json',
    'X-Session': process.env.sessionID
  };
  //****************************************************
  //**  END set ajax content-type  and configuration  **
  //****************************************************
  var appState = "error_login";
  var pendingValueStatus = [];
  var deleteTimeout;
  var toCreate = false;
  var validating = false;
  var models = wappsto.models;

  var destroyDevices = function(toDestroy) {
    if (toDestroy.length > 0) {
      if (deleteTimeout) {
        clearTimeout(deleteTimeout);
      }
      network.get("device").destroy({
        url: "/services/network/" + network.get("meta.id") + "/device?" + $.param({
          id: toDestroy
        }),
        error: function(model, response) {
          if (response.status != 404 && response.status != 410) {
            deleteTimeout = setTimeout(function() {
              destroyDevices(toDestroy);
            }, 30 * 1000);
          }
        }
      });
    }
  };

  var updateData = function(obj) {
    //check if object different than data attributes
    data.set(obj);
    data.save(obj, {
      patch: true
    });
  };

  var getBridgeConfig = function() {
    axios({
      url: baseUrl + "bridge/" + username + "/config",
      headers: hueHeader,
      method: "GET",
      dataType: "json",
      contentType: "application/json"
    })
      .then(function({ data }) {
      network.set({
        "name": data.name + " - " + data.bridgeid
      });
      updateData({
        "username": username,
        "bridgeId": data.bridgeid
      });
      if (bridgeId != data.bridgeid) {
        bridgeId = data.bridgeid;
        destroyDevices(network.get("device").map(e => e.get("meta.id")));
      }
      validateAndCreate();
    })
      .catch(function() {
      appState = "error_login";
      updateData({
        "status": statusMessage.error_get_bridge_config
      });
    });
  };

  var createHueUser = function() {
    axios({
      url: baseUrl + "bridge",
      headers: hueHeader,
      method: "POST",
      dataType: "json",
      contentType: "application/json",
      data: JSON.stringify({
        "devicetype": "wappsto-qa"
      })
    })
      .then(function({ data }) {
      username = data[0].success.username;
      getBridgeConfig();
    })
      .catch(function() {
      appState = "error_login";
      updateData({
        "status": statusMessage.error_create_user
      });
    });
  };

  var createHueConfig = function() {
    axios({
      url: baseUrl + "bridge/0/config",
      headers: hueHeader,
      method: "PUT",
      dataType: "json",
      contentType: "application/json",
      data: JSON.stringify({
        "linkbutton": true
      })
    })
      .then(function() {
      createHueUser();
    })
      .catch(function(error) {
      appState = "error_login";
      updateData({
        "status": statusMessage.error_create_config
      });
    });
  };

  var refreshTokenExpireTime;
  var refreshTimeout;
  var refreshToken = function() {
    console.log("refreshing token");
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    if ((new Date()).getTime() < refreshTokenExpireTime) {
      axios({
        url: baseUrl + "oauth2/refresh?grant_type=refresh_token",
        method: "POST",
        headers: {
          Authorization: 'Basic ' + base64.encode(clientId + ":" + clientSecret)
        },
        data: {
          refreshToken: data.get("token").refresh_token
        }
      })
        .then(function({ data }) {
        token = data.access_token;
        updateData({
          "token": data
        });
        addTokenRefresh(data);
        hueHeader.Authorization = "Bearer " + token;
        createHueConfig();
        console.log("success refresh token");
      })
        .catch(function(response) {
        console.log("error refresh token: ", response);
        if (appState != "error_refresh_token") {
          appState = "error_refresh_token";
          updateData({
            "status": statusMessage.error_create_token
          });
        }
        refreshTimeout = setTimeout(function() {
          console.log("adding token refresh interval every 30 sec");
          refreshToken();
        }, 1000 * 30);
      });
    } else {
      appState = "error_login";
      updateData({
        "status": statusMessage.please_login
      });
    }
  };

  function addTokenRefresh(response) {
    console.log("adding token refresh timeout");
    refreshTokenExpireTime = (new Date()).getTime() + (response.refresh_token_expires_in * 1000);
    refreshTimeout = setTimeout(function() {
      refreshToken();
    }, response.access_token_expires_in * 1000);
  }

  var getToken = function(code) {
    console.log("getting token");
    axios({
      url: baseUrl + "oauth2/token?grant_type=authorization_code&code=" + code,
      method: "POST",
      headers: {
        Authorization: 'Basic ' + base64.encode(clientId + ":" + clientSecret)
      }
    })
      .then(function({ data }) {
      token = data.access_token;
      updateData({
        "token": data
      });
      addTokenRefresh(data);
      hueHeader.Authorization = "Bearer " + token;
      createHueConfig();
    })
      .catch(function(error) {
      appState = "error_login";
      updateData({
        "status": statusMessage.error_create_token
      });
    });
  };

  //** adding login listener **
  wStream.on("message", function(e) {
    try {
      let data = JSON.parse(e.data);
      data.forEach(function(message){
        if (message.meta_object.type == "extsync" && !message.extsync.uri.endsWith("/console")) {
          var query = JSON.parse(message.extsync.body);
          query = query.search;
          query = query.split("&");
          var queryObj = {};
          for (var i = 0; i < query.length; i++) {
            var str = query[i].split("=");
            queryObj[str[0]] = str[1];
          }
          updateData({
            "status": statusMessage.logging_in
          });
          appState = "getting_token";
          getToken(queryObj.code);
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

  //uses getUrl variable to make the request
  function validateAndCreate() {
    if (appState != "processing" && bridgeId && username && token) {
      appState = "processing";
      var requestData = getRequestData("get");
      axios({
        headers: hueHeader,
        url: baseUrl + requestData.url,
        method: requestData.method,
        data: requestData.body
      })
        .then(function({ data }) {
        toCreate = false;
        parseData(data);
        removeOldDevices(data);
        if (toCreate) {
          var options = {
    		subscribe: true,
            success: function() {
              appState = "success_update_wappsto_data";
              updateData({
                "status": statusMessage.success_update_wappsto_data
              });
              clearPendingValueStatus();
              addValueListeners(network);
            },
            error: function() {
              appState = "error_update_wappsto_data";
              updateData({
                "status": statusMessage.error_update_wappsto_data
              });
            }
          };
          network.save({}, options);
        } else {
          appState = "success_update_wappsto_data";
          updateData({
            "status": statusMessage.success_update_wappsto_data
          });
          addValueListeners(network);
        }
      })
        .catch(function(error) {
        var status;
        if (error.response && error.response.data && error.response.data.fault && error.response.data.fault.detail && error.response.data.fault.detail.errorcode == "keymanagement.service.invalid_access_token") {
          appState = "error_login";
          status = statusMessage.please_login;
        } else {
          appState = "error_get_bridge_data";
          status = statusMessage.error_get_bridge_data;
        }
        updateData({
          "status": status
        });
        console.log("failed to get bridge data");
      });
    }
  }

  //create a device using data
  function createDevice(data) {
    var device = new models.Device();
    device.set(data);
    return device;
  }

  //create a value and state using data, data should contain stateData attribute {stateData: "my_val"}
  function createValue(device, data) {
    var value = new models.Value();
    value.set(data);
    setDataType(data.name, value);
    data = convertToWappstoData(data.name, data.stateData);
    createPermissionState(value, data);
    return value;
  }

  //create states using permission
  function createPermissionState(value, data) {
    switch (value.get("permission")) {
      case "r":
        createState(value, "Report", data);
        break;
      case "w":
        createState(value, "Control", data);
        break;
      case "rw":
        createState(value, "Control", data);
        createState(value, "Report", data);
        break;
      default:
        break;
    }
  }

  //create a state and add it to valueModel
  function createState(valueModel, type, data) {
    var state = new models.State();
    state.set("type", type);
    state.set("data", data + "");
    var timestamp = new Date().toISOString();
    state.set("timestamp", timestamp + "");
    valueModel.get("state").push(state);
  }

  //change device status to "ok"
  function clearPendingValueStatus() {
    pendingValueStatus.forEach(function(value) {
      value.save({
        "status": "ok"
      }, {
        patch: true
      });
    });
  }

  //add listeners to all the controlStates and fire "postRequest" function whenever we receive a stream event from the control value
  function addValueListeners(network) {
    //adding network destroy listener
    var onNetworkDestroy = function() {
      wStream.unsubscribe(network);
      validateAndCreate();
    };
    network.off("destroy", onNetworkDestroy);
    network.on("destroy", onNetworkDestroy);

    //adding listeners to value and state
    network.get("device").forEach(function(device) {
      device.get("value").forEach(function(value) {
        //adding value status listener
        var onValueMessage = function(model, data) {
          if (data.status === "update") {
            value.save({
              "status": "pending"
            }, {
              patch: true
            });
            pendingValueStatus.push(value);
            validateAndCreate();
          }
        };
        value.off("stream:message", onValueMessage);
        value.on("stream:message", onValueMessage);

        //adding control value data change listener
        var controlState = value.get("state").findWhere({
          "type": "Control"
        });
        if (controlState) {
          var onControlMessage = function(model, data) {
            data = data.data + "";
            console.log("controlState data changed to: " + data);
            postRequest(controlState, data);
          };
          controlState.off("stream:message", onControlMessage);
          controlState.on("stream:message", onControlMessage);
        }
      });
    });
  }

  //update report state on the server
  function saveStateData(state, data) {
    var reportState;
    if (state.get("type") == "Report") {
      reportState = state;
    } else {
      state.set("data", data);
      reportState = state.parent().get("state").findWhere({
        "type": "Report"
      });
    }
    if (reportState) {
      var timestamp = new Date().toISOString();
      reportState.save({
        "data": data + "",
        timestamp: timestamp + ""
      }, {
        patch: true
      });
    }
  }

  //send request to post url
  function postRequest(state, data) {
    var convData = convertData(state, data);
    console.log("sending " + convData);
    var parsedData;
    try {
      parsedData = JSON.parse(convData);
    } catch (e) {
      parsedData = convData;
    }
    var requestData = getRequestData("update", state, parsedData);
    axios({
      headers: hueHeader,
      dataType: "json",
      contentType: "application/json",
      url: baseUrl + requestData.url,
      method: requestData.method,
      data: JSON.stringify(requestData.body)
    })
      .then(function(response) {
      if (response.data[0] && response.data[0].hasOwnProperty("success")) {
        saveStateData(state, data);
      }
    })
      .catch(function(error) {
      console.log("failed to update state: " + state.get("meta.id") + " - of value: " + state.parent().get("meta.id") + " - " + state.parent().get("name"));
    });
  }

  //*************************************************************************************************
  //** return the url, method, and body for the request                                            **
  //** by default, get is used to get the data, and update used to update                            **
  //*************************************************************************************************
  function getRequestData(type, state, newData) {
    var url, method, body;
    switch (type) {
      case "get":
        url = "bridge/" + username + "/lights";
        method = "GET";
        break;
      case "update":
        var value = state.parent();
        var device = value.parent();
        url = "bridge/" + username + "/lights/" + device.get("product") + "/state";
        method = "PUT";
        body = {};
        body[value.get("name")] = newData;
        break;
      default:
        break;
    }
    return {
      url: url,
      method: method,
      body: body
    };
  }

  //********************************************************************************************************
  //** TO CHANGE!!! here you are going to create your devices, values and states                          **
  //** if you want to create/update the network, set toCreate to true(toCreate = true)                    **
  //** this function will be called each time you call "validateAndCreate" function and try to parse data,**
  //** so update your network here each and everytime you find a new data                                 **
  //** don't forget to add the new data to the network/device...                                          **
  //********************************************************************************************************
  function parseData(data) {
    for (let id in data) {
      let light = data[id];
      var device = network.get("device").findWhere({
        "serial": light.uniqueid
      });
      if (!device) {
        toCreate = true;
        var deviceObj = {
          "name": light.name,
          "type": light.type,
          "serial": light.uniqueid,
          "manufacturer": light.manufacturername,
          "communication": "always",
          "protocol": "hue",
          "included": "1",
          "product": id
        };
        device = createDevice(deviceObj);
        for (let key in light.state) {
          let lightVal = light.state[key];
          var valueObj = {
            "name": key,
            "type": deviceObj.type,
            "permission": "rw",
            "status": "ok",
            "stateData": lightVal //this will be state.data
          };
          var value = createValue(device, valueObj);
          device.get("value").push(value);
        }
        network.get("device").push(device);
      } else {
        for (let key in light.state) {
          let lightVal = light.state[key];
          var val = device.get("value").findWhere({
            name: key
          });
          if (val) {
            var reportState = val.get("state").findWhere({
              type: "Report"
            });
            if (reportState) {
              var newData = convertToWappstoData(key, lightVal);
              if (reportState.get("data") != newData) {
                saveStateData(reportState, newData);
              }
            }
          }
        }
      }
    }
  }

  //remove devices that are not in bridge anymore
  function removeOldDevices(data) {
    var hueIds = [];
    for (let key in data) {
      hueIds.push(data[key].uniqueid);
    }
    var toDelete = [];
    network.get("device").each(function(device) {
      if (hueIds.indexOf(device.get("serial")) == -1) {
        toDelete.add(device.get("meta.id"));
      }
    });
    destroyDevices(toDelete);
  }

  //*************************************************************************************
  //** TO CHANGE if needed!!! this function will be called each time we are going to send a request to the device, so if your device accept true/false and in "setDataType" function you changed it to integer, here you shoud change it back to Boolean
  //*************************************************************************************
  function convertData(state, data) {
    var value = state.parent();
    if (value.attributes.hasOwnProperty("number")) {
      data = parseFloat(data);
      var number = value.get("number");
      var min = parseFloat(number.min);
      var max = parseFloat(number.max);
      if (max - min === 1) {
        if (data === min) {
          data = false;
        } else {
          data = true;
        }
      }
    }
    return data;
  }

  //************************************************************************************
  //** TO CHANGE(don't change the default case)!!! set value dataType and update data **
  //** in this function, you should change the raw received data to the wanted data   **
  //************************************************************************************
  function setDataType(valueName, valueModel) {
    switch (valueName) {
      case "on":
      case "reachable":
        valueModel.set("number", {
          min: 0,
          max: 1,
          step: 1,
          unit: "int"
        });
        break;
      case "bri":
      case "sat":
        valueModel.set("number", {
          min: 0,
          max: 255,
          step: 1,
          unit: "int"
        });
        break;
      case "hue":
        valueModel.set("number", {
          min: 0,
          max: 65535,
          step: 1,
          unit: "int"
        });
        break;
      default:
        valueModel.set("string", {
          max: 99
        });
        break;
    }
  }

  function convertToWappstoData(valueName, stateData) {
    switch (valueName) {
      case "on":
      case "reachable":
        if (stateData) {
          stateData = "1";
        } else {
          stateData = "0";
        }
        break;
      case "xy":
        stateData = stateData + "";
        break;
      default:
        stateData = JSON.stringify(stateData) + "";
        break;
    }
    return stateData;
  }

  if (bridgeId && token && username) {
    hueHeader.Authorization = "Bearer " + token;
    validateAndCreate();
  }
}
