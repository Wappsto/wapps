let Wappsto = require("wapp-api");
let wappsto = new Wappsto();

let wappstoConsole = require("wapp-api/console");
wappstoConsole.start(); // to start sending logs

var network;

// this function creates a PERMISSION REQUEST to the user who installs this wapp.
//In this specific permission request it is required to retrieve 1 Network that has a name: "Smart Home Simulator"
wappsto.get("network", {"name":"Smart Home Simulator"}, {
    expand: 4,
    quantity:1,
    success: networkCollection => {
      // You will always receive a collection of models. In this case you will only need one (which is first)
      network = networkCollection.first();
      console.log("This is your network in background", network);
    },
    error: (networkCollection, response) => {
      console.log("Something went wrong");
    }
  }
);
