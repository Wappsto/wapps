const Wappsto = require("wapp-api");
const axios = require("axios");
const auth = require("./auth");
const fitbit = require("./fitbit");
const util = require("./util");

const wappsto = new Wappsto();

const wappStatus = {
  warning_login_required: "Please login to Fitbit account",
  success_convert_data: "Succesfully converted Fitbit data to Wappsto UDM",
  warning_convert_data: "Starting the conversion process..",
  error_convert_data: "Error converting Fitbit data to Wappsto UDM",
  success_retrieve_data: "Succesfully retrieved Fitbit Network",
  error_retrieve_data: "Error retrieving Fitbit Network",
  success_update_data: "Succesfully updated Fitbit Network",
  error_update_data: "Error updating Fitbit Network"
};

let updateTimer;
// 5 minutes
let updateTimeInterval = 300000;

let data, network;

const dataPromise = new Promise((resolve, reject) => {
  wappsto
    .get("data", {}, { expand: 1, subscribe: true })
    .then(collection => {
      resolve(collection.first());
    })
    .catch(error => {
      console.log(`Error getting Wappsto data: ${error}`);
    });
});

const networkPromise = new Promise((resolve, reject) => {
  wappsto
    .get("network", {}, { expand: 5, subscribe: true })
    .then(collection => {
      resolve(collection.find({ name: "Fitbit" }));
    })
    .catch(error => {
      console.log(`Error getting Fitbit network: ${error}`);
    });
});

Promise.all([dataPromise, networkPromise])
  .then(result => {
    data = result[0];
    network = result[1];

    startWapp();
  })
  .catch(error => {
    console.log(`Error occured: ${error}`);
  });

const startWapp = () => {
  if (network) {
    setUpdateTimer();

    updateWappstoData({ status_message: wappStatus.success_retrieve_data });
  } else {
    updateWappstoData({ status_message: wappStatus.warning_login_required });
    // waiting for the access token to be saved
    data.on("change:accessToken", () => {
      // ensuring that the conversion process takes place only once
      if (!network && data.get("accessToken")) {
        convertToWappstoUDM();
      }
    });
  }
  // declare and init stream
  const wStream = wappsto.wStream;
  // subscribe to extsync
  wStream.subscribe("/extsync");
  // add stream listener
  wStream.on("message", event => {
    try {
      let streamdata = JSON.parse(event.data);
      streamdata.forEach(message => {
        if (message.meta_object.type === "extsync") {
          let query = JSON.parse(message.extsync.body);
          let queryObj = {};
          if (query) {
            query = query.search;
            if (query) {
              query = query.split("&");
              for (let i = 0; i < query.length; i++) {
                let str = query[i].split("=");
                queryObj[str[0]] = str[1];
              }
            }
          }
          if (queryObj.code) {
            auth
              .getAccessToken(queryObj.code)
              .then(response => {
                data.save(
                  {
                    accessToken: response.data.access_token,
                    refreshToken: response.data.refresh_token
                  },
                  {
                    patch: true,
                    error: () => {
                      console.log("Error saving access tokens..");
                    }
                  }
                );
              })
              .catch(error => {
                console.log(`Could not get access token: ${error}`);
              });
          }
        }
      });
    } catch (error) {
      console.log(`Error occured: ${error}`);
    }
  });
};

// Convert Fitbit data to Wappsto UDM
const convertToWappstoUDM = () => {
  updateWappstoData({ status_message: wappStatus.warning_convert_data });
  // Create network
  network = util.createNetwork(wappsto);
  // Create dashboard device
  let dashboardDevice = util.createDevice(wappsto, "Dashboard");
  // Create sleep stage device
  let sleepStageDevice = util.createDevice(wappsto, "Sleep stage");
  // Wait for all the needed Fitbit data to be delivered
  axios
    .all([
      fitbit.getActivities(data.get("accessToken")),
      fitbit.getFood(data.get("accessToken")),
      fitbit.getSleep(data.get("accessToken"))
    ])
    .then(
      axios.spread((fitbitActivities, fitbitFood, fitbitSleep) => {
        const allowedValueTypes = ["calories", "floors", "heart rate", "sleep", "steps", "water"];
        // Create values based on the allowed value types and Fitbit data
        allowedValueTypes.forEach(valueType => {
          let valueToAdd;
          // Value type is used to assign the right Fitbit data to the coresponding value
          switch (valueType) {
            case "calories":
              valueToAdd = util.createValue(wappsto, valueType, fitbitFood.data);
              break;
            case "floors":
              valueToAdd = util.createValue(wappsto, valueType, fitbitActivities.data);
              break;
            case "heart rate":
              valueToAdd = util.createValue(wappsto, valueType, fitbitActivities.data);
              break;
            case "sleep":
              let sleepData = fitbitSleep.data.sleep[0].levels.data;
              // Create sleep values of type Wake, Light, REM and Deep
              for (let i = 0; i < sleepData.length; i++) {
                let sleepStage = formatSleepStage(sleepData[i].level);
                // Ensuring that no duplicate sleep values are created
                let foundSleepValue = sleepStageDevice.get("value").find({ name: sleepStage });
                // If the sleep value is not found then create it and add it to the Sleep stage device
                if (!foundSleepValue) {
                  let sleepValueToAdd = util.createValue(wappsto, valueType, sleepData[i]);

                  if (sleepStageDevice) {
                    if (sleepValueToAdd) {
                      sleepStageDevice.get("value").push(sleepValueToAdd);
                    }
                  }
                }
              }
              break;
            case "steps":
              valueToAdd = util.createValue(wappsto, valueType, fitbitActivities.data);
              break;
            case "water":
              valueToAdd = util.createValue(wappsto, valueType, fitbitFood.data);
              break;
          }
          // Add new values to Dashboard device
          if (dashboardDevice) {
            if (valueToAdd) {
              dashboardDevice.get("value").push(valueToAdd);
            }
          }
        });
        if (dashboardDevice && sleepStageDevice) {
          // Add devices to network
          network.get("device").push(dashboardDevice);

          network.get("device").push(sleepStageDevice);
          // Save the new Fitbit Network
          saveNetwork();
        }
      })
    )
    .catch(error => {
      console.log(`Error getting Fitbit data: ${error}`);
      updateWappstoData({ status_message: error_convert_data });
    });
};

const formatSleepStage = sleepStage => {
  if (sleepStage === "rem") {
    sleepStage = sleepStage.toUpperCase();
  } else {
    sleepStage = sleepStage.replace(/^./, sleepStage[0].toUpperCase());
  }
  return sleepStage;
};

// Timer used to update report states
const setUpdateTimer = () => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
  updateTimer = setInterval(() => {
    updateReportStates();
  }, updateTimeInterval);
};

// Update value report states
const updateReportStates = () => {
  let dashboardDeviceValues = network
    .get("device")
    .at(0)
    .get("value");

  let sleepStageDeviceValues = network
    .get("device")
    .at(1)
    .get("value");

  axios
    .all([
      fitbit.getActivities(data.get("accessToken")),
      fitbit.getFood(data.get("accessToken")),
      fitbit.getSleep(data.get("accessToken"))
    ])
    .then(
      axios.spread((fitbitActivities, fitbitFood, fitbitSleep) => {
        const allowedValueTypes = ["calories", "floors", "heart rate", "sleep", "steps", "water"];

        allowedValueTypes.forEach(valueType => {
          let valueToUpdate;
          let reportState;
          let newReportData;

          switch (valueType) {
            case "calories":
              valueToUpdate = dashboardDeviceValues.find({
                name: "Calories burned"
              });

              reportState = valueToUpdate.get("state").find({ type: "Report" });

              newReportData = fitbitFood.data.summary.calories ? fitbitFood.data.summary.calories : "0";
              break;
            case "floors":
              valueToUpdate = dashboardDeviceValues.find({
                name: "Floors"
              });

              reportState = valueToUpdate.get("state").find({ type: "Report" });

              newReportData = fitbitActivities.data.summary.floors ? fitbitActivities.data.summary.floors : "0";
              break;
            case "heart rate":
              valueToUpdate = dashboardDeviceValues.find({
                name: "Resting heart rate"
              });

              reportState = valueToUpdate.get("state").find({ type: "Report" });

              newReportData = fitbitActivities.data.summary.restingHeartRate
                ? fitbitActivities.data.summary.restingHeartRate
                : "NO_DATA";
              break;
            case "sleep":
              let sleepData = fitbitSleep.data.sleep[0] ? fitbitSleep.data.sleep[0].levels.data : [];
              // Start and current date are used to get logs
              // Start date is the date from three days ago
              let startDate = new Date(new Date().setDate(new Date().getDate() - 3)).toISOString();
              // Current date is now
              let currentDate = new Date().toISOString();

              if (sleepData.length > 0) {
                for (let i = 0; i < sleepData.length; i++) {
                  let sleepStage = formatSleepStage(sleepData[i].level);

                  let sleepValueToUpdate = sleepStageDeviceValues.find({
                    name: sleepStage
                  });

                  let sleepReportState = sleepValueToUpdate.get("state").find({ type: "Report" });

                  let newSleepReportData = sleepData[i].dateTime;
                  // To properly update sleep values, new data is compared to current report data and historical data to avoid inserting duplicates
                  sleepReportState.getLogs({
                    query: `start=${startDate}&end=${currentDate}&limit=3600`,
                    success: (model, response, XHRResponse) => {
                      let sleepLogs = response.data;

                      if (sleepReportState.get("data") !== newSleepReportData) {
                        if (sleepLogs.length > 0) {
                          let found = false;
                          for (let i = 0; i < sleepLogs.length; i++) {
                            let sleepLogData = sleepLogs[i].data;
                            if (sleepLogData === newSleepReportData) {
                              found = true;
                            }
                          }
                          if (!found) {
                            sleepReportState.save({ data: newSleepReportData }, { patch: true });
                          }
                        } else {
                          sleepReportState.save({ data: newSleepReportData }, { patch: true });
                        }
                      }
                    },
                    error: (model, XHRResponse) => {
                      console.log("Could not get logs..");
                    }
                  });
                }
              }
              break;
            case "steps":
              valueToUpdate = dashboardDeviceValues.find({ name: "Steps" });

              reportState = valueToUpdate.get("state").find({ type: "Report" });

              newReportData = fitbitActivities.data.summary.steps ? fitbitActivities.data.summary.steps : "NO_DATA";
              break;
            case "water":
              valueToUpdate = dashboardDeviceValues.find({ name: "Water" });

              reportState = valueToUpdate.get("state").find({ type: "Report" });

              newReportData = fitbitFood.data.summary.water ? fitbitFood.data.summary.water : "0";
              break;
          }
          if (valueType !== "sleep" && reportState.get("data") !== newReportData.toString()) {
            reportState.save({ data: newReportData.toString() }, { patch: true });
          }
        });
        setUpdateTimer();

        updateWappstoData({ status_message: wappStatus.success_update_data });
      })
    )
    .catch(error => {
      if (error.response && error.response.status === 401) {
        auth
          .getRefreshToken(data.get("refreshToken"))
          .then(response => {
            data.save(
              {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token
              },
              {
                patch: true,
                success: () => {
                  // try to update again
                  updateReportStates();
                },
                error: () => {
                  console.log("error saving tokens..");
                }
              }
            );
          })
          .catch(error => {
            console.log("error refreshing tokens..");
          });
      }
      console.log(`Error updating Fitbit network: ${error}`);

      updateWappstoData({ status_message: wappStatus.error_update_data });
    });
};

// Save data to Wappsto Data
const updateWappstoData = dataToUpdate => {
  data.set(dataToUpdate);

  data.save(dataToUpdate, {
    patch: true,
    error: () => {
      console.log("Error saving Wappsto data..");
    }
  });
};

// Save network
const saveNetwork = () => {
  network.save(
    {},
    {
      success: () => {
        updateWappstoData({ status_message: wappStatus.success_convert_data });
        // Update to fill in log data of sleep values
        updateReportStates();
      },
      error: error => {
        console.log(`Error saving Fitbit network: ${error}`);

        updateWappstoData({ status_message: wappStatus.error_convert_data });
      }
    }
  );
};
