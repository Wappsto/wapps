// Philips Hue remote API configuration
var clientID = "your_meethue_clientid";
var appid = "your_meethue_appid";
var deviceid = "your_deviceid";

var wappsto = new Wappsto();
var data;

wappsto.get("data", {}, {
  expand:1,
  subscribe: true,
  success: function(col){
    data = col.first();
    data.set({
      "status": ""
    });
    data.on("change:status", function() {
      updateStatus();
    });
    refreshBackground();
    updateStatus();
  }
});

var updateStatus = function() {
  var statusField = $("#statusId");
  if(data.get("status")) {
    statusField.text(data.get("status"));
  }
};

$(document).ready(function() {
  $("#refresh").hide();
});

function openLoginPage() {
  let tokenID = sessionStorage.getItem("tokenID");
  window.open("/third_auth/login.html?domain=https://api.meethue.com/oauth2/auth&clientid=" + clientID + "&response_type=code&deviceid=" + deviceid + "&state=seluxit&appid=" + appid + "&installationToken=" + tokenID, 'MyWindow', width = 400, height = 300);
}

function refreshBackground() {
  if(data){
    $("#refresh").show();
    data.save({
      "refresh": _.uniqueId("refresh")
    }, {
      patch: true,
      success: function() {
        $("#refresh").hide();
      },
      error: function() {
        $("#refresh").hide();
      }
    });
  }
}
