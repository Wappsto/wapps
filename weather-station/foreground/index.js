let client_id = "your_client_id";

let wappsto = new Wappsto();
let data, network;
let devices = [];

let showStatus;
let stationName;
let stationData;

$(document).ready(function() {
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
});

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
          console.log("updating data");
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

let deleteExistingData = function() {
  wappsto.get(
    "network",
    { name: "Netatmo Weather Station" },
    {
      expand: 5,
      subscribe: true,
      success: function(collection) {
        if (collection.length > 0) {
          network = collection.first();

          network.destroy().catch(function(error) {
            // console.log(error);
          });

          showStatus.innerHTML =
            "<p class='success'> Succesfully deleted existing data </p>";
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

let restart = function() {
  getNetwork();
};

let updateData = function() {
  showStatus.innerHTML = "";
  status = data.get("status_message");
  showStatus.innerHTML = status + "";

  if (status === "Succesfully retrieved Wappsto data") {
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

      if (data.get("lostDevices")) {
        let lostDevices = data.get("lostDevices");
        lostDevices.forEach(function(lostDevice) {
          stationData.innerHTML +=
            "<p><strong> " + lostDevice + " </strong> is unreachable </p>";
        });
      }
    }
  }
};

let openLoginPage = function() {
  // needs redirect uri
  let url =
    "https://api.netatmo.com/oauth2/authorize?client_id=" +
    client_id +
    "&redirect_uri=http://localhost:3000&scope=read_station&state=seluxit";

  window.open(url);

  //window.location.replace(url);
};
