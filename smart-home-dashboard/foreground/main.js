let wappsto = new Wappsto();

console.log("Wapp Started");

let network;
// this function creates a PERMISSION REQUEST to the user who installs it. In this specific permission request it is required to retrieve 1 Network taht has a name "Smart Home Simulator"
wappsto.get("network", {"name":"Smart Home Simulator"}, {
    expand: 4,
    quantity:1,
    success: networkCollection => {
      // You will always receive a collection of models. In this case you will only need one (which is first)
      network = networkCollection.first();
      console.log("This is your network in foreground", network);
    },
    error: (networkCollection, response) => {
      console.log("Something went wrong");
    }
  }
);
