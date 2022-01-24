// get device
var camera = network.get("device").findWhere({
  "name": pumpkinConfig.device.camera.name
});

// get value
var cameraVal = camera.get("value").findWhere({
  "name": pumpkinConfig.device.camera.valueName
});

//get Report state
var cameraReport = cameraVal.get("state").findWhere({
  "type": "Report"
});

function takePicture() {
  // save camera value with the status "update" to take picture. When using patch, ":id" and ":type" of the value is required.
  cameraVal.save({
    ':type': cameraVal.get(':type'),
    ':id': cameraVal.get(':id'),
    status: "update"
  }, {
    patch: true
  });
}

function updateNose(){
  // show last picture taken by pumpkin camera
  $("input[type='image']").attr("src", cameraReport.get("data"));
}

$(document).ready(function () {
  // update DOM element when page is loaded
  updateNose();
  // on "nose" click call takePicture function
  $("#nose").on("click", takePicture);
});

// listen to device value 'Report' state data changes
cameraReport.on("change:data", function () {
  updateNose();
});
