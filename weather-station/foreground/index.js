let wappsto = new Wappsto();
let data, network;
let devices = [];

let showStatus;
let stationName;
let stationData;

window.onload = () => {
  showStatus = document.getElementById("statusId");
  stationName = document.getElementById("stationId");
  stationData = document.getElementById("stationData");

  wappsto.get(
    "data",
    {},
    {
      expand: 1,
      subscribe: true,
      success: function(collection) {
        data = collection.first();

        getNetwork();

        data.on("change", function() {
          getNetwork();
        });
      },
      error: function(error) {
        console.log(error);
      }
    }
  );
};

let getNetwork = function() {
  wappsto.get(
    "network",
    { name: "Netatmo Weather Station" },
    {
      expand: 5,
      subscribe: true,
      success: function(collection) {
        if (collection.length > 0) {
          network = collection.first();

          devices = network.get("device");

          updateData();
        } else {
          showStatus.innerHTML =
            "<p class='failure'> Could not find Netatmo Weather Station network </p>";
          stationName.innerHTML = "";
          stationData.innerHTML = "";
        }
      },
      error: function(error) {
        console.log(error);
      }
    }
  );
};

let updateData = function() {
  showStatus.innerHTML = "";
  status = data.get("status_message");
  showStatus.innerHTML = status + "";

  if (
    status === "Failed to convert Wappsto data" ||
    status === "Failed to update Wappsto data"
  ) {
    showStatus.innerHTML = "<p class='failure'> " + status + "</p>";
  }

  if (
    status === "Succesfully converted Netatmo data to Wappsto UDM" ||
    status === "Succesfully updated Wappsto data"
  ) {
    showStatus.innerHTML = "<p class='success'> " + status + "</p>";
    stationName.innerHTML = "";
    stationName.innerHTML = data.get("stationName") + " Station";
    stationData.innerHTML = "";
    if (devices) {
      devices.forEach(function(device) {
        stationData.innerHTML += "<h4> " + device.get("name") + " </h4>";
        device.get("value").forEach(function(value) {
          let state = value
            .get("state")
            .find({ type: "Report" })
            .get("data");

          let valueName = value.get("name");
          switch (valueName) {
            case "Temperature":
              stationData.innerHTML +=
                "<p><i class='fas fa-thermometer-three-quarters'></i> " +
                value.get("name") +
                " : " +
                state +
                " " +
                value.get("number").unit +
                "</p>";
              break;
            case "CO2":
              stationData.innerHTML +=
                "<p><i class='fab fa-envira'></i> " +
                value.get("name") +
                " : " +
                state +
                " " +
                value.get("number").unit +
                "</p>";
              break;
            case "Humidity":
              stationData.innerHTML +=
                "<p><i class='fas fa-tint'></i> " +
                value.get("name") +
                " : " +
                state +
                " " +
                value.get("number").unit +
                "</p>";
              break;
            case "Noise":
              stationData.innerHTML +=
                "<p><i class='fas fa-music'></i> " +
                value.get("name") +
                " : " +
                state +
                " " +
                value.get("number").unit +
                "</p>";
              break;
            case "Pressure":
              stationData.innerHTML +=
                "<p><i class='fas fa-tachometer-alt'></i> " +
                value.get("name") +
                " : " +
                state +
                " " +
                value.get("number").unit +
                "</p>";
              break;
            default:
              stationData.innerHTML +=
                "<p> " +
                value.get("name") +
                " : " +
                state +
                " " +
                value.get("number").unit +
                "</p>";
          }
        });
      });
    }
  }
};
