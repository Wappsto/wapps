var appData = getData({})[0];
var htmlTemplate = getFileContent("htmlTemplate.html");
var $container = $("#container");

var $debug = $("#debug");

var printDebugInfo = function(theDebugInfo){
  if (theDebugInfo){
  	$debug.css("display", "block");
    $debug.empty();
  	$debug.append(theDebugInfo);
  } else {
 	$debug.css("display", "hidden");
  }
}

var weatherDevice = getDevice({"manufacturer": "Open Weather Map"},{"message": "foreground data says, you need open weather map"})[0];
var weatherPlace = weatherDevice.get("value").findWhere({"type":"place"});
var weatherTemp = weatherDevice.get("value").findWhere({"type": "Temperature"});

var placeStateControl = weatherPlace.get("state").findWhere({"type": "Control"});
var placeStateReport = weatherPlace.get("state").findWhere({"type": "Report"});


var tempState = weatherTemp.get("state").findWhere({"type": "Report"});


var populateChosenCityReportState = function(){
 	var theCityTarget = $('#cityReportValue');
 	var theTempTarget = $('#chosenCityTemp');
	var theTempState = tempState.get("data");
  	theTempState = Math.floor(theTempState - 273,15);
  	//another option: weatherPlace.get("state.0.data");
  	theCityTarget.text(placeStateReport.get("data")); 
  	theTempTarget.text(theTempState);
  	//printDebugInfo('report place: '+placeStateReport.get("data")+' , control place: '+placeStateControl.get("data"));
  	if (placeStateReport.get("data") != placeStateControl.get("data")){
    	theCityTarget.text(placeStateReport.get("data")+' ('+ placeStateControl.get("data")+' can\'t be found)');     
    }
  	printDebugInfo(''+JSON.stringify(weatherPlace));
}
populateChosenCityReportState();

var reportFailureToUser = function(){
	printDebugInfo('failure, dude');
}
var reportPendingToUser = function(){
	printDebugInfo('request pending');
}



placeStateReport.on("change", function(data){
	if(data){
      switch(data.get("status")){
        case "Failed":
          reportFailureToUser();
          break;
        case "Pending":
          reportPendingToUser();
          break;
        case "Send":
          //waiting for tempChange
          tempState.once("change", function(){
            populateChosenCityReportState();
          });
          break;
      }
    }
});

var saveCity = function(){
  	
    var controlCityChoice = $('#citychoice').val();
	printDebugInfo('hey now '+controlCityChoice);
  
  	placeStateControl.save({
		"data": controlCityChoice
	}, {
		wait: true,
		success: function(){
			console.log("success");
          	showSuccess("City saved");
		},
		error: function(){
			console.log("error");
          	showError("City... um, not saved");
		}
	});
    /**/
    
	
}



var addField = function(data){
	data = data || {};
	var $template = $(htmlTemplate);
	$template.find("#min").val(data["min"] || 0);
	$template.find("#max").val(data["max"] || 20);
  	if(data.hasOwnProperty("quote")){
      $template.find("#quote").val(data["quote"]);
    } else {
      $template.find("#quote")[0].placeholder = "add quote here";
    }
	$container.append($template);
}
var saveFields = function(){
	var quotes = [];
	var elements = $container.find(".element");
	for(var i=0; i < elements.length; i++){
		var elem = $(elements[i]);
		var min = elem.find("#min").val();
		var max = elem.find("#max").val();
		var quote = elem.find("#quote").val();
		quotes.push({min, max, quote});
	}
	appData.save({
		"quotes": quotes
	}, {
		wait: true,
		success: function(){
			console.log("success");
          	showSuccess("Quotes saved");
		},
		error: function(){
			console.log("error");
          	showError("Quotes... um, not saved");
		}
	});
}
var loadFields = function(){
  	$container.empty();
	if(appData.get("quotes")){
		var quotes = appData.get("quotes");
		for(var i = 0; i < quotes.length; i++){
			addField(quotes[i]);
		}
	}
}
var deleteField = function(elem){
	$(elem).closest(".element").remove();
}
function showSuccess(message){
	//alert(message);
}
function showError(message){
	//alert(message);
}
loadFields();
