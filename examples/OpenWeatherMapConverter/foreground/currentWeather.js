var device = network.get("device").findWhere({"name": networkInfo.device[0].name});
var city = device.get("value").findWhere({name: "city"});

device.on("stream:data", function(data){
  	device.set(data);
	$("#currentWeather").html(currentValueList());
});

$("#currentWeather").html(currentValueList());

function setCurrentLocation(){
  var name = $("#currentLocation").val(),
      timestamp = new Date().toISOString(),
      controlState = city.get("state").findWhere({"type":"Control"});
  if(name){
    controlState.save({
      "data": name,
      "timestamp": timestamp + ""
    }, {
      wait: true,
      error: function(){
        console.log("An error occured.");
      }
    });
  }
}

function currentValueList(){
  var list = "",
      data = "";
  $.each(device.get("value").models, function(key, value) {
    var unit = "";
    if(value.get("number")){
      unit = value.get("number").unit;
    }
    data = value.get("state").findWhere({"type":"Report"}).get("data");
    if(value.get("type") == "timestamp"){
      var timestamp = data;
      data = new Date(0);
      data.setUTCSeconds(timestamp);
    }
    list += "<li>" + value.get("name") + ": <strong id='"+value.get("name")+"Data'>" + data + "</strong> " + unit + "</li>";
  });
  return list;
}
