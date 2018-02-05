var data = getData()[0];

if (data.get("apiKey")) {
 $("#configApiKey").text(data.get("apiKey"));
}

function saveApiKey() {
  var apiKey = $("#apiKey").val();
  data.save({
    "apiKey": apiKey
  }, {
    wait: true,
    success: function() {
      $("#configApiKey").text(apiKey);
      updateStatusMessage({type: "success", message: "API key was updated."});
    },
    error: function() {
      updateStatusMessage({type: "error", message: "An error occured. Please try again."});
    }
  });
}
