var appData = getData()[0];
var network = getNetwork()[0];
network.set("name", "Twitter Publisher");

var initialize = function(){
  	if(network.get("device").length == 0){
      var device = {
          "name": "twitter",
          "manufacturer": "twitter",
          "communication": "always",
          "value": [{
              "name": "post",
              "type": "post",
              "string": {"max": 99},
              "permission": "w",
              "state":[{
                  "type": "Control",
                  "data": "",
                  "timestamp": new Date().toISOString()
              }]
          }],
      };
      network.get("device").add(device);
      addNetwork(network, {
          wait: true,
          success: function(model){
            addPostMessageListener();
            console.log("network save success");
          },
          error: function(){
            console.log("network save error");
            //error could be handled here
          }
        });
    } else {
    	addPostMessageListener();
    }
}

initialize();


function addPostMessageListener(){
  network.get("device").each(function(device){
    device.get("value").each(function(value){
   		var controlState = value.get("state").findWhere({"type": "Control"});
      	if(controlState){
        	controlState.on("stream:data", function(stateJSON){
              var message = stateJSON.data;
              postMessage(message);
            });
        }
    });
  });
}


function postMessage(message){
  var config = appData.get("config");
  if(!config){
    return false;
  }
  if(!config.hasOwnProperty("consumerKey") || !config.hasOwnProperty("consumerSecret") || !config.hasOwnProperty("accessToken") || !config.hasOwnProperty("accessTokenSecret")){
    return false;
  }
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
  var requestUrl = "statuses/update.json";
  var request_data = {
	url: twitterUrl + requestUrl,
    method: 'POST',
    data: {
      status: message
    }
  };
  var headers = oAuth.toHeader(oAuth.authorize(request_data, token));
  headers["X-Session"] = sessionID;
  $.ajax({
  	url:  externalUrl + requestUrl + (request_data.data ? "?" + $.param(request_data.data) : ""),
    method: request_data.method,
    headers:  headers
  }).done(function(){
    showSuccess("message '"+ message +"' tweeted");
  }).fail(function(response){
    if(response.status != 200){
      showError("something went wrong: " + response.responseText);
    } else {
      showSuccess("message '"+ message +"' tweeted");
    }
  })
}

function showSuccess(message){
  console.log(message);
}

function showError(message){
  console.error(message);
}
