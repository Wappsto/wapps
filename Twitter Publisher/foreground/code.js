//Retrieve the Data model of this app
var appData = getData({})[0];

//Check if there's a config value in appData that's a valid set of Twitter credentials
checkIfValid(appData && appData.get("config"));

//Writes the values to the frontend 'saved data' section
updateConfigFields();

//Called when saving form in frontend
debugger;
var saveUserData = function(){
  var config = {
    consumerKey: $("#consumerKey").val(),
    consumerSecret: $("#consumerSecret").val(),
    accessToken: $("#accessToken").val(),
    accessTokenSecret: $("#accessTokenSecret").val(),
  }
  checkIfValid(config, true);
}


function checkIfValid(config, save){
  
  var validProperties = function(config){
	if(!config){
      return false;
    }
    if(!config.hasOwnProperty("consumerKey") || !config.hasOwnProperty("consumerSecret") || !config.hasOwnProperty("accessToken") || !config.hasOwnProperty("accessTokenSecret")){
      return false;
    }
    return true;
  };
  var haveAllProperties = validProperties(config);
  if(!haveAllProperties){
    return false;
  }
  
  //formats and encodes data to be sent to Twitter
  //then sends and callback returns success or failure
  //if success, then save in Wappsto with saveConfig() function
  var consumer = {
    key: config.consumerKey,
    secret: config.consumerSecret
  };
  var token = {
    key: config.accessToken,
    secret: config.accessTokenSecret
  };
  var oAuth = OAuth({
  	consumer: consumer,
    signature_method: 'HMAC-SHA1',
    hash_function: function(base_string, key) {
      return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
    }
  });
  var externalUrl = "/external/twitter/1.1/";
  var twitterUrl = "https://api.twitter.com/1.1/";
  var requestUrl = "account/settings.json";
  var request_data = {
	url: twitterUrl + requestUrl,
    method: 'POST',
  };
  var headers = oAuth.toHeader(oAuth.authorize(request_data, token));
  headers["X-Session"] = sessionID;
  $.ajax({
  	url:  externalUrl + requestUrl + (request_data.data ? "?" + $.param(request_data.data) : ""),
    method: request_data.method,
    headers:  headers
  }).done(function(){
    if(save){
      saveConfig(config);
    }    
  }).fail(function(response){
    showError("wrong configuration");
  })
}

//saving Twitter configuration under appData
function saveConfig(config){
  appData.save({
  	":id": appData.get(":id"),
    ":type": appData.get(":type"),
    "config": config
  }, {
    wait: true,
    patch: true,
    success: function(){
      clearFields();
      updateConfigFields();
      showSuccess("configuration saved");
    },
    error: function(){
      showError("failed to save data");
    }
  })
}

//clears form
function clearFields(){
	$("#consumerKey").val("");
    $("#consumerSecret").val("");
    $("#accessToken").val("");
    $("#accessTokenSecret").val("");
}

//writes to 'saved data' area
function updateConfigFields(){
  if(appData && appData.get("config")){
    var config = appData.get("config");
    $("#configConsumerKey").text(config.consumerKey);
    $("#configConsumerSecret").text(config.consumerSecret);
    $("#configAccessToken").text(config.accessToken);
    $("#configAccessTokenSecret").text(config.accessTokenSecret);
  }
}

function showSuccess(message){
  alert(message);
}

function showError(message){
  alert(message);
}
