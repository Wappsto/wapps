// Define shared across the functions variables:
let device, sensors, led, ledListen, data;

// Instantiate wapp-api:
const wapp = new Wappsto();

// Define a color transition schema (HEX values) for Sensor icons:
const colorSchema = {
  CO2: ["60A664", "EEC800", "D86C00", "C1312C"],
  temperature: ["8AD5D7", "01B7CD", "FDB813", "F37020", "C9234B"],
  pressure: ["60A664", "EEC800", "D86C00", "C1312C"],
  humidity: ["C7F2FF", "6EADDF", "4F96D8", "357ECD", "1C68C0"]
};

// Get the "network" object that contains all the necessary information for this wapp:
wapp
  .get(
    "network",
    {
      name: "Smart Home"
    },
    {
      expand: 5,
      subscribe: true,
      quantity: 1
    }
  )
  .then(function(collection) {
    // Extract objects and assign them to the shared variables:
    device = collection.get("0.device");
    sensors = device.find({ name: "Sensors" }).get("value");
    led = device.find({ name: "LED" }).get("value");

    // Call the wapp kick-off functions:
    initValueListeners();
    init();
  })
  .catch(console.error);

// Get the data model to enable communication between the foreground and background
wapp
  .get(
    "data",
    {},
    {
      subscribe: true
    }
  )
  .then(function(collection) {
    data = collection.first();
  })
  .catch(console.error);

function initValueListeners() {
  var panel = led
    .find({ name: "LED Panel" })
    .get("state")
    .find({ type: "Control" });

  // Find all boxes that represent devices:
  $.each($('[id^="v-"]'), function(i, e) {
    e = $(e); // Convert the plain HTML element to a jQuery element:

    // Extract and modify some information:
    var name = e
      .attr("id")
      .split("v-")[1]
      .replace("_", " ");
    var schema = colorSchema[name];
    name = name.charAt(0).toUpperCase() + name.slice(1);
    var value = sensors.find({ name: name }) || led.find({ name: name });
    var state = value.get("state").find({ type: "Report" });

    // Listen to the incoming "state" changes (events) using a WebSocket
    // connection and trigger the following function on such events:
    state.on("change:data", function(model) {
      // Extract some information:
      var data = model.get("data");
      var min = value.get("number.min");
      var max = value.get("number.max");

      if (schema) {
        // Do some math to calculate the % based on the
        // current value and the allowed value range:
        var index = Math.round(((+data - min) * 100) / (max - min));
        // Generate a palette of 100 colors based on the color schema for the given sensor:
        var color = chroma
          .bezier(schema)
          .scale()
          .colors(100);
        // Find the icon and change its color:
        e.find("i").css("color", color[index]);
      }

      // Convert some information:
      var date = new Date(model.get("timestamp"));
      var dataString =
        +Number(data).toFixed(2) + " " + value.get("number.unit") + " ";

      // Find HTML elements and change their current content
      // with the extracted and calculated data:
      e.find(".date").html(date.toLocaleDateString());
      e.find(".time").html(date.toLocaleTimeString());
      e.find(".value").html(dataString);
      e.find(".report").html(+Number(data).toFixed(2) || data);
      e.find(".unit").html(value.get("number.unit"));
      e.find(".min").html(min);
      e.find(".max").html(max);
      e.find(".step").html(value.get("number.step"));
      e.find("time").timeago("update", state.get("timestamp"));

      // Pass the current value to the LED Panel if the selected sensor matches:
      if (e.attr("id") === ledListen) {
        panel.save({ data: dataString }, { patch: true });
      }
    });

    // Trigger the "state" change event manually to initialize the view:
    state.emit("change:data", state);

    // Extract the "Control" information and display them:
    var stateC = value.get("state").find({ type: "Control" });
    if (stateC) {
      stateC.on("change:data", function(model) {
        var data = model.get("data");
        e.find(".control").html(data);
      });
      stateC.emit("change:data", stateC);
    }
  });
}

function init() {
  initColorPicker();
  initRoundSlider();
  if (led) {
    initPanel();
    initButton();
  }
}

$(document).ready(init);

function initColorPicker() {
  var htmlColorPicker = $("#colorPicker");

  var colorPicker = function() {
    // Remove the current Color Picker HTML element to achieve
    // the resize effect as it's not responsive on its own:
    htmlColorPicker.empty();

    // Create a Color Picker HTML element with the current box width:
    var iroCp = new iro.ColorPicker("#colorPicker", {
      width: htmlColorPicker.parent().width()
    });

    // Listen to the selected Color Picker HEX values, convert
    // to decimal and send them to the LED strip:
    iroCp.on(["input:end"], function(event) {
      if (led) {
        var decimal = parseInt(event.hexString.slice(1), 16).toString();
        rgb.find({ type: "Control" }).save({ data: decimal }, { patch: true });
      }
    });

    if (led) {
      var rgb = led.find({ name: "RGB" }).get("state");
      var color = rgb.find({ type: "Control" }).get("data");
      try {
        // Set the Color Picker pointer to the current stored value:
        iroCp.color.hexString = (+color).toString(16);
      } catch (e) {
        console.error(e);
      }

      var rgbR = rgb.find({ type: "Report" });
      rgbR.on("change:data", function(model) {
        // Listen to the reported Color Picker values and display them:
        var col = (+model.get("data")).toString(16);
        htmlColorPicker
          .parent()
          .find("i")
          .css("color", "#" + col);
      });
      rgbR.emit("change:data", rgbR);
    }
  };

  // Listen to the window size changes:
  $(window).resize(colorPicker);

  // Create a Color Picker HTML element:
  colorPicker();
}

function initRoundSlider() {
  var htmlRoundSlider = $("#roundSlider");

  var roundSlider = function() {
    // Find the current "Brightness" value to set the Slider pointer:
    if (led) {
      var model = led
        .find({ name: "Brightness" })
        .get("state")
        .find({ type: "Control" });
      var value = model.get("data");
    } else {
      var value = 0;
    }

    htmlRoundSlider.roundSlider({
      radius: htmlRoundSlider.parent().width() / 2,
      handleSize: "+10",
      handleShape: "dot",
      sliderType: "min-range",
      value: +value,
      change: function(event) {
        if (led) {
          model.save({ data: event.value.toString() }, { patch: true });
        }
      }
    });
  };

  // Listen to the window size changes, when it happens, recreate the Round Slider
  // HTML element to achieve the resize effect as it's not responsive on its own:
  $(window).resize(roundSlider);

  // Create a Round Slider HTML element:
  roundSlider();
}

function initPanel() {
  // Find HTML elements and extract some data:
  var form = $("#v-LED_Panel form");
  var input = form.find('input[type="text"]');
  var panel = led
    .find({ name: "LED Panel" })
    .get("state")
    .find({ type: "Control" });
  input.val(panel.get("data"));

  // Listen to the input text field changes:
  form
    .submit(function(event) {
      // Unselect the sensor icon to avoid current text overwrites:
      $("#v-LED_Panel .panel-icons input:checked").click();
      panel.save({ data: input.val() || " " }, { patch: true });
      event.preventDefault();
    })
    .keypress(function(event) {
      // Listen to enter keystrokes:
      if (event.which == 13) {
        form.submit();
        event.preventDefault();
      }
    });

  // Listen to the icon selects, once icon is selected it will pass
  // the current value of the selected sensor to the LED Panel:
  $("#v-LED_Panel .panel-icons input").click(function() {
    if (this.value === ledListen) {
      this.checked = false;
      ledListen = undefined;
    } else {
      ledListen = this.value;
      if (this.value === "temperature-CO2") {
        // Save custom option used to display temperature along with CO2 on the panel
        saveSelectedSensor("temperature-CO2");
        var temp_value = sensors.find({ name: "Temperature" });
        var temp_data = temp_value
          .get("state")
          .find({ type: "Report" })
          .get("data");
        var CO2_value = sensors.find({ name: "CO2" });
        var CO2_data = CO2_value.get("state")
          .find({ type: "Report" })
          .get("data");

        panel.save(
          {
            data:
              +Number(temp_data).toFixed(2) +
              " " +
              temp_value.get("number.unit") +
              " " +
              +Number(CO2_data).toFixed(2) +
              " " +
              CO2_value.get("number.unit") +
              " "
          },
          { patch: true }
        );
      } else {
        var name = this.value.split("v-")[1].replace("_", " ");
        name = name.charAt(0).toUpperCase() + name.slice(1);
        var value = sensors.find({ name: name });
        saveSelectedSensor(value.get("name"));
        var data = value
          .get("state")
          .find({ type: "Report" })
          .get("data");

        panel.save(
          {
            data:
              +Number(data).toFixed(2) + " " + value.get("number.unit") + " "
          },
          { patch: true }
        );
      }
    }
  });
}

function saveSelectedSensor(value) {
  // Saves a sensor value to the data model
  data.save({ sensorToUpdate: value }, { patch: true });
}

function saveBrightnessOption(option) {
  // Saves brightness state data to the data model
  data.save({ brightnessOption: option }, { patch: true });
}

function initButton() {
  let btn = led
    .find({ name: "Button" })
    .get("state")
    .find({ type: "Report" });

  // Listen to the physical button presses and display the current state:
  btn.on("change:data", function() {
    if (btn.get("data") === "1") {
      $("#switch-brightness").prop("checked", true);
      $("#brightness-label").html("Brightness On");
    } else {
      $("#switch-brightness").prop("checked", false);
      $("#brightness-label").html("Brightness Off");
    }
  });

  btn.emit("change:data", btn);

  // Get the currently selected brightness state and save it
  let value = $("#roundSlider").roundSlider("option", "value");
  saveBrightnessOption(value);
}

function showDetails() {
  // Toggle the view of boxes:
  $.each($(".info"), function(i, e) {
    $(e)
      .toggle()
      .parent()
      .find("div:first")
      .toggle();
  });
}

function updateDevices() {
  // Pull data from the Raspberry Pi:
  wapp.send({
    method: "patch",
    url: "/value",
    data: { status: "update" }
  });
}
