enableExtsync();

$.ajaxSetup({
  headers: {
    'Content-type': 'application/json',
    'Accept': 'application/json',
    'X-Session': sessionID
  }
});

var data = getData()[0];
data.set({"status": ""});

refreshBackground();

var updateStatus = function(){
  var statusField = $("#statusId");
  switch(data.get("status")){
    case "refreshing":
      statusField.text(data.get("status"));
      break;
    case "error_create_token":
      statusField.text(data.get("status"));
      break;
    case "error_get_bridge_data":
      statusField.text(data.get("status"));
      break;
    case "error_create_config":
      statusField.text(data.get("status"));
      break;
    case "error_create_user":
      statusField.text(data.get("status"));
      break;
    case "creating_bridge_user":
      statusField.text(data.get("status"));
      break;
    case "success_update_wappsto_data":
      statusField.text(data.get("status"));
      break;
    case "error_update_wappsto_data":
      statusField.text(data.get("status"));
      break;
    case "error_get_bridge_config":
      statusField.text(data.get("status"));
      break;
    case "please_login":
      statusField.text(data.get("status"));
      break;
    case "logging_in":
      statusField.text(data.get("status"));
      break;
    default:
      statusField.text("");
      break;
  }
};

data.on("change:status", function(){
  updateStatus();
});
updateStatus();

$(document).ready(function () {
  $("#refresh").hide();
});

function openLoginPage(){
  window.open("/third_auth/login.html?deviceid=test-sami&domain=https://api.meethue.com/oauth2/auth&clientid=euOF3dHTU8aMGmUy75VRxcMxgt8b0MUJ&response_type=code&deviceid=seluxit-test&state=seluxit&appid=wappsto-local-dev&installationToken="+tokenID, 'MyWindow', width=400, height=300)
}

function refreshBackground(){
  $("#refresh").show();
  data.set("status", "refreshing");
  data.save({
    ":id": data.get(":id"),
    ":type": data.get(":type"),
    "refresh": _.uniqueId("refresh"),
    "status": "refreshing"
  },{
    wait: true,
    patch: true,
    success: function(){
      $("#refresh").hide();
    },
    error: function(){
      $("#refresh").hide();
    }
  })
}
