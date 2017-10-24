// get network device
var mouth = network.get("device").findWhere({
  "name": pumpkinConfig.device.mouth.name
});

// get device value
var mouthVal = mouth.get("value").findWhere({
  "name": pumpkinConfig.device.mouth.valueName
});

// get 'Report' state
var mouthReport = mouthVal.get("state").findWhere({
  "type": "Report"
});

function updateMouth(){
  // update DOM element with the device value state data
  $("#mouth").val(mouthReport.get("data"));
}

$(document).ready(function () {
  // call 'updateMouth' function to match DOM element with the device
  updateMouth();

  // on "enter" key press save value
  $("#mouth").on('keydown', function (e) {
    if (e.which == 13) {
      mouthVal.get("state").findWhere({
        "type": "Control"
      }).save({
        "data": $(this).val()
      });
    }
  });
});

// listen to device value 'Report' state data changes
mouthReport.on("change:data", function () {
  // update DOM element with the device value state data
  updateMouth();
});
