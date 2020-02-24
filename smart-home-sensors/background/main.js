const Wappsto = require("wapp-api");

const wappsto = new Wappsto();

const wappstoConsole = require("wapp-api/console");
wappstoConsole.start();

let device, sensors, led, data;

let getNetwork = async () => {
  try {
    const collection = await wappsto.get(
      "network",
      {
        name: "Smart Home"
      },
      {
        quantity: 1,
        expand: 5,
        subscribe: true
      }
    );
    device = collection.get("0.device");
  } catch (error) {
    console.log(error);
  }
};

getNetwork().then(() => {
  sensors = device.find({ name: "Sensors" }).get("value");
  led = device.find({ name: "LED" }).get("value");

  initSensorListerners();
  initButtonListener();
  initBrightnessListener();
});

let getData = async () => {
  try {
    const collection = await wappsto.get(
      "data",
      {},
      {
        expand: 5,
        subscribe: true
      }
    );
    data = collection.first();
  } catch (error) {
    console.log(error);
  }
};

getData().then(() => {
  data.on("change", () => {
    updateSensorData(data.get("sensorToUpdate"));
  });
});

function initSensorListerners() {
  if (sensors) {
    sensors.each(sensorValue => {
      let sensorState = sensorValue.get("state").find({ type: "Report" });

      sensorState.on("change:data", () => {
        let currentlySelectedSensor = data.get("sensorToUpdate");
        let sensorName = sensorValue.get("name");

        if (currentlySelectedSensor === sensorName) {
          updateSensorData(currentlySelectedSensor);
        } else if (currentlySelectedSensor === "temperature-CO2") {
          updateSensorData(currentlySelectedSensor);
        }
      });
    });
  }
}

function updateSensorData(sensorValueToBeUpdated) {
  let panel = led
    .find({ name: "LED Panel" })
    .get("state")
    .find({ type: "Control" });

  if (sensors) {
    if (sensorValueToBeUpdated === "temperature-CO2") {
      let temp_value = sensors.find({ name: "Temperature" });
      let temp_data = temp_value
        .get("state")
        .find({ type: "Report" })
        .get("data");

      let co2_value = sensors.find({ name: "CO2" });
      let co2_data = co2_value
        .get("state")
        .find({ type: "Report" })
        .get("data");

      panel.save(
        {
          data: `${+Number(temp_data).toFixed(2)} ${temp_value.get("number.unit")} ${+Number(co2_data).toFixed(2)} ${co2_value.get("number.unit")}`
        },
        { patch: true }
      );
    } else {
      let foundSensorValue = sensors.find({ name: sensorValueToBeUpdated });

      if (foundSensorValue) {
        let data = foundSensorValue
          .get("state")
          .find({ type: "Report" })
          .get("data");

        panel.save({
          data: `${+Number(data).toFixed(2)} ${foundSensorValue.get("number.unit")}`
        });
      } else {
        console.log("Sensor could not be found");
      }
    }
  }
}

function initButtonListener() {
  if (led) {
    let button = led
      .find({ name: "Button" })
      .get("state")
      .find({ type: "Report" });
    let brightness = led
      .find({ name: "Brightness" })
      .get("state")
      .find({ type: "Control" });

    button.on("change:data", model => {
      let isButtonOn = model.get("data");
      let userBrightnessOption = data.get("brightnessOption");
      let setting = 0;

      if (isButtonOn === "1") {
        setting = userBrightnessOption;
      }

      brightness.save({ data: setting.toString() }, { patch: true });
    });
  }
}

function initBrightnessListener() {
  if (led) {
    let button = led
      .find({ name: "Button" })
      .get("state")
      .find({ type: "Report" });
    let brightnessState = led
      .find({ name: "Brightness" })
      .get("state")
      .find({ type: "Report" });
    let userBrightnessOption = data.get("brightnessOption");

    brightnessState.on("change:data", () => {
      let currentBrightnessOption = brightnessState.get("data");
      let currentButtonOption = button.get("data");

      if (currentButtonOption === "1") {
        if (currentBrightnessOption !== userBrightnessOption) {
          data.save(
            { brightnessOption: currentBrightnessOption },
            { patch: true }
          );
        }
      }
    });
  }
}
