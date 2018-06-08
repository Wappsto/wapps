//******************************************************
//**  START set ajax content-type  and configuration  **
//******************************************************

load("jquery.js");
load("underscore.js");

var statusMessage = {
  "error_create_token": "error_create_token",
  "error_get_bridge_data": "error_get_bridge_data",
  "error_create_config": "error_create_config",
  "error_create_user": "error_create_user",
  "success_update_wappsto_data": "success_update_wappsto_data",
  "error_update_wappsto_data": "error_update_wappsto_data",
  "error_get_bridge_config": "error_get_bridge_config",
  "please_login": "please_login",
  "logging_in": "logging_in"
};

var data = getData()[0];

//** the uniqueID should be something like gatewayId or serial number, something unique that you get from the user  **
var username = data.get("username");
var bridgeId = data.get("bridgeId");
var token = data.get("token") && data.get("token")["access_token"];
//** refresh variable to know when we receive a stream if we should refresh background or not **
var refresh = data.get("refresh");

//** baseUrl is the SERVICE that you are going to use for external requests (proxy thing, ask Tsvetomir) **
var baseUrl = "/external/meethue/";
var hueHeader = {
  'Content-type': 'application/json',
  'Accept': 'application/json',
  'X-Session': sessionID
};
$.ajaxSetup({
  headers: {
    'Content-type': 'application/json',
    'Accept': 'application/json',
    'X-Session': sessionID
  }
});
//****************************************************
//**  END set ajax content-type  and configuration  **
//****************************************************
var appState = "error_login";
var pendingValueStatus = [];
var deleteTimeout;
var toCreate = false;
var validating = false;
var models = getModelsPrototype();
var network = getNetwork()[0];

var destroyDevices = function(toDestroy){
  if(toDestroy.length > 0){
    if(deleteTimeout){
      clearTimeout(deleteTimeout);
    }
    network.get("device").destroy({
      url: "/services/network/"+network.get(":id")+"/device?"+$.param({id: toDestroy}),
      wait: true,
      error: function(model, response){
        if(response.status != 404 && response.status != 410){
          deleteTimeout = setTimeout(function(){
              destroyDevices(toDestroy);
          }, 30 * 1000);
        }
      }
    });
  }
}

var updateData = function(obj){
  //check if object different than data attributes
  data.set(obj);
  data.save(_.extend({}, {
    ":id": data.get(":id"),
    ":type": data.get(":type")
  } ,obj), {
    patch: true
  });
};

var getBridgeConfig = function(){
  $.ajax({
    url: baseUrl + "bridge/"+username+"/config",
    headers: hueHeader,
  	method: "GET",
    dataType: "json",
    contentType: "application/json"
  })
  .done(function(response){
    network.set({"name": response["name"] + " - " + response["bridgeid"]});
    updateData({"username": username, "bridgeId": response["bridgeid"]});
    if(bridgeId != response["bridgeid"]){
      bridgeId = response["bridgeid"];
      destroyDevices(network.get("device").pluck(":id"));
    }
    validateAndCreate();
  })
  .fail(function(){
    appState = "error_login";
    updateData({"status": statusMessage["error_get_bridge_config"]});
  });
};

var createHueUser = function(){
  $.ajax({
    url: baseUrl + "bridge",
    headers: hueHeader,
  	method: "POST",
    dataType: "json",
    contentType: "application/json",
    data: JSON.stringify({"devicetype": "wappsto-local-dev"})
  })
  .done(function(response){
    username = response[0]["success"]["username"];
    getBridgeConfig();
  })
  .fail(function(){
    appState = "error_login";
    updateData({"status": statusMessage["error_create_user"]});
  });
};

var createHueConfig = function(){
  $.ajax({
    url: baseUrl + "bridge/0/config",
    headers: hueHeader,
  	method: "PUT",
    dataType: "json",
    contentType: "application/json",
    data: JSON.stringify({"linkbutton": true})
  })
  .done(function(){
	createHueUser();
  })
  .fail(function(){
    appState = "error_login";
    updateData({"status": statusMessage["error_create_config"]});
  });
};

var refreshTokenExpireTime;
var refreshTimeout;
var refreshToken = function(){
  console.log("refreshing token");
  if(refreshTimeout){
  	clearTimeout(refreshTimeout);
  }
  if((new Date()).getTime() < refreshTokenExpireTime){
    $.ajax({
      url: baseUrl + "oauth2/refresh?grant_type=refresh_token",
      method: "POST",
      headers: {
        Authorization: 'Basic '+btoa("euOF3dHTU8aMGmUy75VRxcMxgt8b0MUJ:aON0mE1njWALzqNw")
      },
      data: {
        refreshToken: data.get("token")["refresh_token"]
      }
    })
    .done(function(response){
      token = response["access_token"];
      updateData({"token": response});
      addTokenRefresh(response);
      hueHeader["Authorization"] = "Bearer "+token;
      createHueConfig();
      console.log("success refresh token");
    })
    .fail(function(response){
      console.log("error refresh token: ", response);
      if(appState != "error_refresh_token"){
        appState = "error_refresh_token";
        updateData({"status": statusMessage["error_create_token"]});
      }
      refreshTimeout = setTimeout(function(){
        console.log("adding token refresh interval every 30 sec");
        refreshToken();
      }, 1000 * 30);
    });
  } else {
  	appState = "error_login";
    updateData({"status": statusMessage["please_login"]});
  }
};

function addTokenRefresh(response){
  console.log("adding token refresh timeout");
  refreshTokenExpireTime = (new Date()).getTime() + (response["refresh_token_expires_in"] * 1000);
  refreshTimeout = setTimeout(function(){
    refreshToken();
  }, response["access_token_expires_in"] * 1000);
};

var getToken = function(code){
  $.ajax({
    url: baseUrl + "oauth2/token?grant_type=authorization_code&code="+code,
    method: "POST",
    headers: {
      Authorization: 'Basic '+btoa("euOF3dHTU8aMGmUy75VRxcMxgt8b0MUJ:aON0mE1njWALzqNw")
    }
  })
  .done(function(response){
    token = response["access_token"];
    updateData({"token": response});
    addTokenRefresh(response);
    hueHeader["Authorization"] = "Bearer "+token;
   	createHueConfig();
  })
  .fail(function(){
    appState = "error_login";
    updateData({"status": statusMessage["error_create_token"]});
  });
};

//** adding login listener **
stream.on("message", function(method, key, data){
  if(key == "extsync"){
    var query = JSON.parse(data["body"]);
    query = query["search"];
    query = query.split("&");
    var queryObj = {};
    for(var i = 0; i < query.length; i++){
      var str = query[i].split("=");
      queryObj[str[0]] = str[1];
    }
    updateData({"status": statusMessage["logging_in"]});
    appState = "getting_token";
    getToken(queryObj["code"]);
  }
});

//** adding bridgeId and token listeners**
data.on("stream:data", function(newData){
  if(refresh != newData["refresh"]){
    console.log("refreshing");
    refresh = newData["refresh"];
    switch(appState){
      case "processing":
      case "getting_token":
        break;
      case "error_login":
        updateData({"status": statusMessage["please_login"]});
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

//uses getUrl variable to make the request
function validateAndCreate(){
  if(appState != "processing" && bridgeId && username && token){
    appState = "processing";
    var requestData = getRequestData("get");
    $.ajax({
      headers: hueHeader,
      url: baseUrl+requestData.url,
      method: requestData.method,
      data: requestData.body
    })
      .done(function(data){
        parseData(data);
      	removeOldDevices(data);
        if(toCreate){
          var options = {
            success: function(){
              appState = "success_update_wappsto_data";
              updateData({"status": statusMessage["success_update_wappsto_data"]});
              clearPendingValueStatus();
              addValueListeners(network);
            },
            error: function(){
              appState = "error_update_wappsto_data";
              updateData({"status": statusMessage["error_update_wappsto_data"]});
            }
          };
          addNetwork(network, options);
        } else {
          appState = "success_update_wappsto_data";
          updateData({"status": statusMessage["success_update_wappsto_data"]});
          addValueListeners(network);
        }
      })
      .fail(function(response){
      	var status;
        if(response && response.responseJSON && response.responseJSON.fault && response.responseJSON.fault.detail && response.responseJSON.fault.detail.errorcode == "keymanagement.service.invalid_access_token"){
          appState = "error_login";
          status = statusMessage["please_login"];
        } else {
          appState = "error_get_bridge_data";
          status = statusMessage["error_get_bridge_data"];
        }
      	updateData({"status": status});
        console.log("failed to get bridge data");
      });
  }
}

//create a device using data
function createDevice(data){
  var device = new models["Device"]();
  device.set(data);
  return device;
}

//create a value and state using data, data should contain stateData attribute {stateData: "my_val"}
function createValue(device, data){
  var value = new models["Value"]();
  value.set(data);
  setDataType(data["name"], value);
  data = convertToWappstoData(data["name"], data["stateData"]);
  createPermissionState(value, data);
  return value;
}

//create states using permission
function createPermissionState(value, data){
  switch(value.get("permission")){
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
function createState(valueModel, type, data){
  var state = new models["State"]();
  state.set("type", type);
  state.set("data", data + "");
  var timestamp = new Date().toISOString();
  state.set("timestamp", timestamp+"");
  valueModel.get("state").push(state);
}

//change device status to "ok"
function clearPendingValueStatus(){
  _.each(pendingValueStatus, function(value){
    value.save({"status": "ok"}, {wait: true});
  });
}

//add listeners to all the controlStates and fire "postRequest" function whenever we receive a stream event from the control value
function addValueListeners(network){
  //adding network destroy listener
  network.off("destroy", null, "converterAddValueListeners");
  network.on("destroy", function(){
    validateAndCreate();
  }, "converterAddValueListeners");

  //adding listeners to value and state
  _.each(network.get("device").models, function(device){
    _.each(device.get("value").models, function(value){
      //adding value status listener
      value.off("stream:data", null, "converterAddValueListeners");
      value.on("stream:data", function(data){
        if(data.status === "update"){
          value.save({"status": "pending"}, {wait: true});
          pendingValueStatus.push(value);
          validateAndCreate();
        }
      }, "converterAddValueListeners");

      //adding control value data change listener
      var controlState = value.get("state").findWhere({"type": "Control"});
      if(controlState){
        controlState.off("stream:data", null, "converterAddValueListeners");
        controlState.on("stream:data", function(data){
          data = data.data;
          console.log("controlState data changed to: "+data);
        	postRequest(controlState, data);
        }, "converterAddValueListeners");
      }
    });
  });
}

//update report state on the server
function saveStateData(state, data){
  var reportState;
  if(state.get("type") == "Report"){
    reportState = state;
  } else {
    state.set("data", data);
    reportState = state.collection.findWhere({"type": "Report"});
  }
  if(reportState){
    var timestamp = new Date().toISOString();
    reportState.save({
      ":id": reportState.get(":id"),
      ":type": reportState.get(":type"),
      "data": data+"",
      timestamp: timestamp+""
    }, {
      wait: true,
      patch: true
    });
  }
}

//send request to post url
function postRequest(state, data){
  var convData = convertData(state, data);
  console.log("sending "+convData);
  var parsedData;
  try{
    parsedData = JSON.parse(convData);
  } catch(e){
    parsedData = convData;
  }
  var requestData = getRequestData("update", state, parsedData);
  $.ajax({
    headers: hueHeader,
    dataType: "json",
    contentType: "application/json",
    url: baseUrl + requestData.url,
    method: requestData.method,
    data: JSON.stringify(requestData.body)
  })
  	.done(function(response){
      if(response[0] && response[0].hasOwnProperty("success")){
        saveStateData(state, data);
      }
  	})
  	.fail(function(error){
      console.log("failed to update state: "+ state.get(":id") + " - " +state.get("name"));
  	});
}

//*************************************************************************************************
//** return the url, method, and body for the request                                            **
//** by default, get is used to get the data, and update used to update                            **
//*************************************************************************************************
function getRequestData(type, state, newData){
  var url, method, body;
  switch(type){
    case "get":
      url = "bridge/"+username+"/lights";
      method = "GET";
      break;
    case "update":
      var value = state.parent();
      var device = value.parent();
      url = "bridge/"+username+"/lights/" +device.get("product")+"/state";
      method = "PUT";
      body = {}
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
function parseData(data){
  _.each(data, function(light, id){
    var device = network.get("device").findWhere({"serial": light["uniqueid"]});
    if(!device){
      toCreate = true;
      var deviceObj = {
        "name": light["name"],
        "type": light["type"],
        "serial": light["uniqueid"],
        "manufacturer": light["manufacturername"],
        "communication": "always",
        "protocol": "hue",
        "included": "1",
        "product": id
      };
      device = createDevice(deviceObj);
      _.each(light["state"], function(lightVal, key){
        var valueObj = {
          "name": key,
          "type": deviceObj["type"],
          "permission": "rw",
          "status": "ok",
          "stateData": lightVal //this will be state.data
        };
        var value = createValue(device, valueObj);
        device.get("value").push(value);
      });
      network.get("device").push(device);
    } else {
      _.each(light["state"], function(lightVal, key){
        var value = device.get("value").findWhere({name: key});
        if(value){
          var reportState = value.get("state").findWhere({type: "Report"});
          if(reportState){
            var newData = convertToWappstoData(key, lightVal);
            if(reportState.get("data") != newData){
              saveStateData(reportState, newData);
            }
          }
        }
      });
    }
  });
}

//remove devices that are not in bridge anymore
function removeOldDevices(data){
  var hueIds = _.pluck(data, "uniqueid");
  var toDelete = [];
  network.get("device").each(function(device){
    if(hueIds.indexOf(device.get("serial")) == -1){
      toDelete.add(device.get(":id"));
    }
  });
  destroyDevices(toDelete);
}

//*****************************************************************************************************************
//** TO CHANGE if needed!!! this function will be called each time we are going to send a request to the device, **
//** so if your device accept true/false and in "setDataType" function you changed it to integer, here you shoud **
//** change it back to Boolean                                                                                   **
//*****************************************************************************************************************
function convertData(state, data){
  var value = state.parent();
  if(value.attributes.hasOwnProperty("number")){
    data = parseFloat(data);
    var number = value.get("number");
    var min = parseFloat(number.min);
    var max = parseFloat(number.max);
    if(max - min === 1){
      if(data === min){
        data = false;
      } else {
        data = true;
      }
    }
  }
  return data;
}

//***********************************************************************************
//** TO CHANGE(don't change the default case)!!! set value dataType and update data **
//** in this function, you should change the raw received data to the wanted data  **
//***********************************************************************************
function setDataType(valueName, valueModel){
  switch(valueName){
    case "on":
    case "reachable":
      valueModel.set("number", {min: 0, max: 1, step: 1, unit: "int"});
      break;
    case "bri":
    case "sat":
      valueModel.set("number", {min: 0, max: 255, step: 1, unit: "int"});
      break;
    case "hue":
      valueModel.set("number", {min: 0, max: 65535, step: 1, unit: "int"});
      break;
    default:
      valueModel.set("string", {max: 99});
      break;
  }
}

function convertToWappstoData(valueName, stateData){
  switch(valueName){
    case "on":
    case "reachable":
      if(stateData){
        stateData = "1";
      } else {
        stateData = "0";
      }
      break;
    case "xy":
      stateData = stateData;
      break;
    default:
      stateData = JSON.stringify(stateData) + "";
      break;
  }
  return stateData;
}

if(bridgeId && token && username){
  hueHeader["Authorization"] = "Bearer "+token;
  validateAndCreate();
}
