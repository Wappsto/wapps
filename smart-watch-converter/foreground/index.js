const wappsto = new Wappsto();

const openFitbitAuthPage = () => {
  const tokenID = sessionStorage.getItem("tokenID");
  const clientID = "your_clientID";
  const redirectURI = "https://light.wappsto.com/third_auth/callback.html";
  const domain = "https://www.fitbit.com/oauth2/authorize";

  window.open(
    `/third_auth/login.html?domain=${domain}&installationToken=${tokenID}&response_type=code&client_id=${clientID}&redirect_uri=${redirectURI}&scope=activity%20nutrition%20heartrate%20location%20nutrition%20profile%20settings%20sleep%20social%20weight&expires_in=604800`
  );
};

let data, network;
let defaultStartDate, selectedStartDate;
let sleepChart = null;

const startWapp = () => {
  // Get Wappsto Data
  wappsto
    .get(
      "data",
      {},
      {
        expand: 1,
        subscribe: true
      }
    )
    .then(collection => {
      data = collection.first();
      // Display login button if no access token is saved yet
      if (!data.get("accessToken")) {
        document.getElementById("login-container").style.display = "block";
      }
      // Display status message
      if (data.get("status_message")) {
        displayWappStatus(data.get("status_message"));
      }

      data.on("change", () => {
        // Hide login button
        if (data.get("accessToken")) {
          document.getElementById("login-container").style.display = "none";
        }
        if (data.get("status_message")) {
          displayWappStatus(data.get("status_message"));
        }
      });
    })
    .catch(error => {
      console.log(`Error getting Wappsto data: ${error}`);
    });
};

const displayWappStatus = status => {
  let circle = document.getElementById("circle");
  let detailedStatusMessage = document.getElementById("detailed-status");
  detailedStatusMessage.textContent = "";
  let shortStatusMessage = document.getElementById("short-status");
  shortStatusMessage.textContent = "";
  // On success status change background color to light green
  if (
    status === "Succesfully converted Fitbit data to Wappsto UDM" ||
    status === "Succesfully retrieved Fitbit Network" ||
    status === "Succesfully updated Fitbit Network"
  ) {
    circle.style.backgroundColor = "#33cc33";
    shortStatusMessage.textContent = "OK";
    // Retrieve Fitbit network
    getNetwork();
  }
  // On warning status change background color to orange
  if (status === "Please login to Fitbit account" || status === "Starting the conversion process..") {
    circle.style.backgroundColor = "orange";
    shortStatusMessage.textContent = "Pending";
  }
  // On error status change background color to red
  if (
    status === "Error converting Fitbit data to Wappsto UDM" ||
    status === "Error retrieving Fitbit Network" ||
    status === "Error updating Fitbit Network"
  ) {
    circle.style.backgroundColor = "#ff0000";
    shortStatusMessage.textContent = "Error";
  }
  detailedStatusMessage.textContent = status;
};

const displayNetworkData = networkToDisplay => {
  let display = document.getElementById("data-container");
  display.innerHTML = "";

  let device = networkToDisplay.get("device").at(0);

  let values = device.get("value");

  for (let j = 0; j < values.length; j++) {
    let value = values.at(j);

    if (
      value.get("type") !== "rem" &&
      value.get("type") !== "light" &&
      value.get("type") !== "deep" &&
      value.get("type") !== "awake"
    ) {
      let valueHeader = `<header><h2>${value.get("name")}</h2><small>${device.get("name")}</small></header>`;

      let valueIcon;

      switch (value.get("name")) {
        case "Calories burned":
          valueIcon = "<i class='fas fa-cookie-bite'></i>";
          break;
        case "Floors":
          valueIcon = "<i class='fas fa-walking'></i>";
          break;
        case "Resting heart rate":
          valueIcon = "<i class='fas fa-heart'></i>";
          break;
        case "Steps":
          valueIcon = "<i class='fas fa-shoe-prints'></i>";
          break;
        case "Water":
          valueIcon = "<i class='fas fa-glass-whiskey'></i>";
          break;
        default:
          valueIcon = "<i class='fas fa-check-square'></i>";
      }

      let stateData = `<p id="state-data"> ${value
        .get("state")
        .at(0)
        .get("data")} </p>`;

      let stateUnit = `<p id="state-unit"> ${value.get("number") ? value.get("number").unit : ""} </p>`;

      let timestamp = value
        .get("state")
        .at(0)
        .get("timestamp");

      let lastUpdated = `<p id="last-updated"> Last updated ${moment(timestamp).fromNow()} </p>`;

      display.innerHTML += `<div class="value-card"> ${valueHeader} ${valueIcon} ${stateData} ${stateUnit} ${lastUpdated} </div>`;
    }
  }
};

// Get network
const getNetwork = () => {
  wappsto
    .get("network", { name: "Fitbit" }, { expand: 5, subscribe: true })
    .then(networkCollection => {
      network = networkCollection.first();
      if (network) {
        displayNetworkData(network);

        displaySleepStagesData(network);
      }
    })
    .catch(error => {
      console.log(`Error getting Fitbit network: ${error}`);
    });
};

const displaySleepStagesData = networkToDisplay => {
  // Default start time is 'today'
  defaultStartDate = "today";
  // Display sleep logs container
  document.getElementById("sleep-logs-container").style.display = "block";

  let sleepTimestamp = networkToDisplay
    .get("device")
    .at(1)
    .get("value")
    .at(0)
    .get("state")
    .at(0)
    .get("timestamp");

  document.getElementById("last-updated-sleep").textContent = `Last updated ${moment(sleepTimestamp).fromNow()}`;

  // Get sleep log data to populate the chart with
  if (selectedStartDate) {
    selectSleepInterval(selectedStartDate);
  } else {
    selectSleepInterval(defaultStartDate);
  }
};

// Return string date based on the selected user interval
const selectSleepInterval = selectedSleepInterval => {
  let startDate;

  if (selectedSleepInterval !== defaultStartDate) {
    selectedStartDate = selectedSleepInterval;
  }

  switch (selectedSleepInterval) {
    case "today":
      startDate = moment()
        .subtract(1, "d")
        .toISOString();
      break;
    case "last-three-days":
      startDate = moment()
        .subtract(3, "d")
        .toISOString();
      break;
    case "last-week":
      startDate = moment()
        .subtract(7, "d")
        .toISOString();
      break;
    default:
      startDate = moment()
        .subtract(1, "d")
        .toISOString();
  }
  retrieveSleepLogs(startDate);
};

const retrieveSleepLogs = startDate => {
  let sleepData = [];
  let sleepStages = ["Awake", "REM", "Light", "Deep"];

  for (let i = 0; i < sleepStages.length; i++) {
    getLogsBySleepStage(startDate, sleepStages[i], sleepData);
  }
};

const getLogsBySleepStage = (startDate, sleepStage, sleeparray) => {
  let sleepValue, sleepState;

  if (sleepStage) {
    sleepValue = network
      .get("device")
      .at(1)
      .get("value")
      .find({ name: sleepStage });

    if (sleepValue) {
      sleepState = sleepValue.get("state").at(0);

      sleepState.getLogs({
        query: `start=${startDate}&end=${moment().toISOString()}&limit=3600`,
        success: (model, response, XHRResponse) => {
          let sleepArray = processSleepData(response, sleepStage, sleeparray);

          displaySleepChart(sleepArray);
        },
        error: (model, XHRResponse) => {
          console.log("Error!");
        }
      });
    }
  }
};

const processSleepData = (sleepLogs, sleepStage, sleepArray) => {
  if (sleepLogs && sleepStage && sleepArray) {
    // Add logs to array
    for (let i = 0; i < sleepLogs.data.length; i++) {
      sleepArray.push({ t: sleepLogs.data[i].data, y: sleepStage });
    }
    // Then sort the array
    sleepArray.sort((a, b) => {
      return moment.utc(a.t).diff(moment.utc(b.t));
    });
    // And return it
    return sleepArray;
  }
};

const displaySleepChart = sleepData => {
  if (sleepChart !== null) {
    sleepChart.destroy();
  }
  let canvas = document.getElementById("sleep-canvas");

  let context = canvas.getContext("2d");

  let sleepGradient = context.createLinearGradient(0, 0, 0, 200);

  sleepGradient.addColorStop(0, "#ff3399");
  sleepGradient.addColorStop(0.5, "#3366ff");
  sleepGradient.addColorStop(0.75, "#00cc66");
  sleepGradient.addColorStop(1, "#006bb3");

  let data = {
    datasets: [
      {
        data: sleepData,
        backgroundColor: sleepGradient,
        borderColor: sleepGradient,
        fill: false,
        steppedLine: "before",
        borderJoinStyle: "round"
      }
    ]
  };

  let options = {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: false
    },
    legend: {
      display: false
    },
    layout: {
      padding: {
        left: 0,
        right: 10,
        top: 0,
        bottom: 0
      }
    },
    scales: {
      xAxes: [
        {
          id: "x-axis",
          type: "time",
          time: {
            unit: "hour",
            unitStepSize: 1,
            tooltipFormat: "h:mm:ss A",
            displayFormats: {
              hour: "h:mm A"
            }
          }
        }
      ],
      yAxes: [
        {
          id: "y-axis",
          type: "category",
          labels: ["Awake", "REM", "Light", "Deep"]
        }
      ]
    }
  };

  sleepChart = new Chart(context, {
    type: "line",
    data: data,
    options: options
  });
};

window.onload = startWapp();
