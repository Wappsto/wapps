load("jquery-2.1.1.js");
load("style.css");

var data = getData()[0];

var saveUserData = function() {
  var apiKey = $("#apikey").val();
  data.save({
    "apiKey": apiKey
  }, {
    wait: true,
    success: function() {
      updateApiKey(apiKey);
      updateStatusMessage("success");
    },
    error: function() {
      updateStatusMessage("error");
    }
  });
};

var updateStatusMessage = function(status) {
  var statusPanel = $("#status");
  var statusMessage = $("#statusMessage");

  statusPanel.show().addClass(status);

  if (status === "success") {
    statusMessage.text("API Key was updated");
  } else {
    statusMessage.text("An error occurred.");
  }

  setTimeout(function(){ statusPanel.hide(); }, 4000);
};

var updateApiKey = function(key) {
  $("#configApiKey").text(key);
};

if (data.get("apiKey")) {
  updateApiKey(data.get("apiKey"));
}
