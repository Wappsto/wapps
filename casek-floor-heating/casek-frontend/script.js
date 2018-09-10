/*
 *  Mappings between Wappsto names and HTML ids
 */

const d2i_temperature = {
    "TEMP AND HUMIDITY 1": "t3",
    "TEMP AND HUMIDITY 2": "t10",
    "TEMP AND HUMIDITY 3": "t1",
    "TEMP AND HUMIDITY 4": "t9",
    "TEMP AND HUMIDITY 5": "t2",
    "TEMP AND HUMIDITY 6": "t4",
    "TEMP AND HUMIDITY 7": "t8",
    "TEMP AND HUMIDITY 8": "t5",
    "TEMP AND HUMIDITY 9": "t6",
    "TEMP AND HUMIDITY10": "t7",
    "TEMP AND HUMIDITY11": "t11",
    "TEMP AND HUMIDITY12": "t0",
};

const d2i_clock = {
    "TEMP AND HUMIDITY 1": "c3",
    "TEMP AND HUMIDITY 2": "c10",
    "TEMP AND HUMIDITY 3": "c1",
    "TEMP AND HUMIDITY 4": "c9",
    "TEMP AND HUMIDITY 5": "c2",
    "TEMP AND HUMIDITY 6": "c4",
    "TEMP AND HUMIDITY 7": "c8",
    "TEMP AND HUMIDITY 8": "c5",
    "TEMP AND HUMIDITY 9": "c6",
    "TEMP AND HUMIDITY10": "c7",
    "TEMP AND HUMIDITY11": "c11",
    "TEMP AND HUMIDITY12": "c0",
};

const d2i_battery = {
    "TEMP AND HUMIDITY 1": "b3",
    "TEMP AND HUMIDITY 2": "b10",
    "TEMP AND HUMIDITY 3": "b1",
    "TEMP AND HUMIDITY 4": "b9",
    "TEMP AND HUMIDITY 5": "b2",
    "TEMP AND HUMIDITY 6": "b4",
    "TEMP AND HUMIDITY 7": "b8",
    "TEMP AND HUMIDITY 8": "b5",
    "TEMP AND HUMIDITY 9": "b6",
    "TEMP AND HUMIDITY10": "b7",
    "TEMP AND HUMIDITY11": "b11",
    "TEMP AND HUMIDITY12": "b0",
};

const d2i_target = {
    "SETPOINT1": "tg3",
    "SETPOINT2": "tg10",
    "SETPOINT3": "tg11",
    "SETPOINT4": "tg1",
    "SETPOINT5": "tg9",
    "SETPOINT6": "tg6",
    "SETPOINT7": "tg5",
    "SETPOINT8": "tg2",
    "SETPOINT9": "tg4",
    "SETPOINT10": "tg8",
};

/*
 *  Get Wappsto devices and data
 */

const dev_sensors = getDevice({name: "TEMP AND HUMIDITY"}, {quantity: 12});
const dev_target = getDevice({name: "Relay Box Set Points"}, {quantity: 1})[0];
let data = getData()[0];

/**
 *  Function for updating the display with the strategy from Uppaal Stratego
 */
function update_strategy() {
    let strategy = data.get("strategy");
    let timestamp = new Date(data.get("timestamp"));
    let valves = strategy.slice(1, -1).split(" ");
    for (let i in valves) {
        let element = document.getElementById("v" + (Number(i)+1));
        if (Number(valves[i]) > 0) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    }
    document.getElementById("c_strategy").innerHTML = timestamp.toUTCString();
}

/**
 * Function for updating the display with data from Wappsto
 */
function update_display() {
    // Update with info from sensors
    for (let i in dev_sensors) {
        // Get objects from Wappsto
        let sensor = dev_sensors[i];
        let values = sensor.get("value");
        let report = values
            .findWhere({type: "Temperature"}).get("state")
            .findWhere({type: "Report"});
        let name = sensor.get("name").toUpperCase();

        // Get values from Wappsto
        let temperature = Number(
            report.get("data")
        );
        let timestamp = new Date(
            report.get("timestamp")
        );
        let battery = Number(
            values
                .findWhere({type: "Battery"}).get("state")
                .findWhere({type: "Report"}).get("data")
        );

        // Get HTML elements
        let t_span = document.getElementById(d2i_temperature[name]);
        let b_img = document.getElementById(d2i_battery[name]);
        let c_img = document.getElementById(d2i_clock[name]);

        // Update display
        t_span.innerHTML = temperature.toFixed(1);
        b_img.title = "Battery Level: " + battery.toFixed(0) + "%";
        if (battery > 96) {
            b_img.src = document.getElementById("bat100").src;
        } else if (battery > 88) {
            b_img.src = document.getElementById("bat080").src;
        } else if (battery > 80) {
            b_img.src = document.getElementById("bat060").src;
        } else if (battery > 70) {
            b_img.src = document.getElementById("bat040").src;
        } else if (battery > 50) {
            b_img.src = document.getElementById("bat020").src;
        } else {
            b_img.src = document.getElementById("bat000").src;
        }
        c_img.title = "";
        if ((Date.now() - timestamp.getTime()) / 1000 > 3600) {
            c_img.src = document.getElementById("attention").src;
            c_img.title = "Data is more than an hour old!\n";
        } else {
            c_img.src = document.getElementById("clock").src;
        }
        c_img.title += "Last updated: " + timestamp.toUTCString();
    }

    // Update set points
    dev_target.get("value").each(function (value) {
        let target = Math.round(
            value.get("state").findWhere({type: "Report"}).get("data")
        );
        let name = value.get("name").toUpperCase();
        let tg_span = document.getElementById(d2i_target[name]);
        tg_span.innerHTML = target.toFixed(0);
    });
}

/**
 *  Function that will be called on load of HTML body
 */
function on_load() {
    // Register callback for backend changes and update it once
    data.on("change", function () {
        update_strategy();
    });
    update_strategy();

    // Add regular updates of display
    setInterval(function () {
        update_display();
    }, 2000);
    update_display();
}
