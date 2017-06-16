var weatherDevice = getDevice({"manufacturer": "Open Weather Map"})[0];
var twitterDevice = getDevice({"manufacturer": "twitter"})[0];
var appData = getData({})[0];

var weatherPlace = weatherDevice.get("value").findWhere({"type": "place"});
var weatherTemp = weatherDevice.get("value").findWhere({"type": "Temperature"});

var placeState = weatherPlace.get("state").findWhere({"type": "Control"});
var tempState = weatherTemp.get("state").findWhere({"type": "Report"});

var twitterPost = twitterDevice.get("value").findWhere({"type": "post"});
var twitterState = twitterPost.get("state").findWhere({"type": "Control"});
var postTwitterMessage = function(message){
	twitterState.save({"data": message}, {
		wait: true,
		success: function(){
			console.log("success");
		},
		error: function(){
			console.log("error");
		}
	});
};
tempState.on("change:data", function(){
	var data = parseInt(tempState.get("data"));
  	var quotes = appData.get("quotes") || [];
  	data = data - 273,15;
  	console.log("looking for quotes of temperature: "+data);
	for(var i = 0; i < quotes.length; i++){
		var quote = quotes[i];
		if(data <= parseInt(quote.max) && data > parseInt(quote.min)){
          	var message = quote["quote"];
          	message = message.replace(/%place%/g, placeState.get("data"));
          	message = message.replace(/%temperature%/g, data);
          	console.log("quote found: "+message);
			postTwitterMessage(message);
			break;
		}
	}
});
