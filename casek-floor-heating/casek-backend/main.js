load("jquery.js")

/*
 *  Mappings between Wappsto names and Uppaal Stratego ids
 */

const d2s_temperature = {
    "TEMP AND HUMIDITY 1": 3,
    "TEMP AND HUMIDITY 2": 10,
    "TEMP AND HUMIDITY 3": 1,
    "TEMP AND HUMIDITY 4": 9,
    "TEMP AND HUMIDITY 5": 2,
    "TEMP AND HUMIDITY 6": 4,
    "TEMP AND HUMIDITY 7": 8,
    "TEMP AND HUMIDITY 8": 5,
    "TEMP AND HUMIDITY 9": 6,
    "TEMP AND HUMIDITY10": 7,
    "TEMP AND HUMIDITY11": 11,
    "TEMP AND HUMIDITY12": 0,
};

const d2s_target = {
    "SETPOINT1": 3,
    "SETPOINT2": 10,
    "SETPOINT3": 11,
    "SETPOINT4": 1,
    "SETPOINT5": 9,
    "SETPOINT6": 6,
    "SETPOINT7": 5,
    "SETPOINT8": 2,
    "SETPOINT9": 4,
    "SETPOINT10": 8,
};

const d2s_valves = {
    "RL 1": 3,
    "RL 2": 10,
    "RL 3": 11,
    "RL 4": 1,
    "RL 5": 9,
    "RL 6": 6,
    "RL 7": 5,
    "RL 8": 2,
    "RL 9": 4,
    "RL 10": 8,
};

/*
 *  Get Wappsto devices and data
 */

const dev_sensors = getDevice({name: "TEMP AND HUMIDITY"}, {quantity: 12});
const dev_target = getDevice({name: "Relay Box Set Points"}, {quantity: 1})[0];
const dev_valves = getDevice({name: "Relay Box"}, {quantity: 2})[1];
let data = getData()[0];

function run_stratego() {
    // Initial values
    let t = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let tg = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let te = [0, 0, 0, 0];
    let v = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let cap = [9, 11, 13, 12, 11, 13, 9, 7, 14, 19, 31];
    let max = 80;

    // Get data from temperature device
    for (let i in dev_sensors) {
        // Get objects from Wappsto
        let sensor = dev_sensors[i];
        let name = sensor.get("name").toUpperCase();

        // Get values from Wappsto
        let temperature = Number(
            sensor.get("value")
                .findWhere({type: "Temperature"}).get("state")
                .findWhere({type: "Report"}).get("data")
        );

        // Update arrays
        if (d2s_temperature[name] === 0) {
            te[0] = temperature;
        } else {
            t[d2s_temperature[name] - 1] = temperature;
        }
    }

    // Get data from target relays
    dev_target.get("value").each(function (value) {
        // Get objects from Wappsto
        let name = value.get("name").toUpperCase();

        // Get values from Wappsto
        let target = Number(
            value.get("state").findWhere({type: "Report"}).get("data")
        );

        // Update arrays
        tg[d2s_target[name] - 1] = target;
    });

    // Get data from valve relays
    dev_valves.get("value").each(function (value) {
        // Get objects from Wappsto
        let name = value.get("name").toUpperCase();

        // Filter values we don't need
        if (name.startsWith("RL")) {
            // Get values from Wappsto
            let valve = Number(
                value.get("state").findWhere({type: "Report"}).get("data")
            );

            // Update arrays
            v[d2s_valves[name] - 1] = valve;
        }
    });

    // Update weather forecast array (just use current temperature for now)
    te[1] = te[0];
    te[2] = te[0];
    te[3] = te[0];

    // Print values
    console.log("t:   [ " + t.map(x => (x<10?" ":"") + x.toFixed(1)).join(', ') + " ]");
    console.log("tg:  [ " + tg.map(x => (x<10?" ":"") + x.toFixed(1)).join(', ') + " ]");
    console.log("te:  [ " + te.map(x => (x<10?" ":"") + x.toFixed(1)).join(', ') + " ]");
    console.log("v:   [ " + v.map(x => (x<10?" ":"") + x.toFixed(0)).join(', ') + " ]");
    console.log("cap: [ " + cap.map(x => (x<10?" ":"") + x.toFixed(0)).join(', ') + " ]");
    console.log("max: " + max);

    // Build URL
    let url = "/";
    t.forEach(function (x) {
        url += x + "_"
    });
    tg.forEach(function (x) {
        url += x + "_"
    });
    te.forEach(function (x) {
        url += x + "_"
    });
    v.forEach(function (x) {
        url += x + "_"
    });
    cap.forEach(function (x) {
        url += x + "_"
    });
    url += max;

    // Call Uppaal Stratego webservice
    $.ajax({
        method: "GET",
        url: "/external/casek-uppaal" + url + "?proto=http",
        headers: {
            "x-session": sessionID
        }
    }).done(function (strategy) {
        console.log("s:   [ " + strategy.slice(1, -1).split(" ").map(
            x => (Number(x)<10?" ":"") + Number(x).toFixed(0)).join(', ') + " ]"
        );
        data.save({
            ":id": data.get(":id"),
            ":type": data.get(":type"),
            "strategy": strategy,
            "timestamp": Date.now(),
        }, {
            wait: true,
            patch: true
        });
    }).fail(function (error) {});
}

// Run Uppaal Stratego now and in regular intervals
run_stratego();
setInterval(function() { run_stratego(); }, (15*60)*1000);
