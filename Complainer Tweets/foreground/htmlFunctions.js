var appData = getData({})[0];
var htmlTemplate = getFileContent("htmlTemplate.html");
var $container = $("#container");
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
          	showError("Quotes saved");
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
	alert(message);
}
function showError(message){
	alert(message);
}
loadFields();
