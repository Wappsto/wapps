const wappsto = new Wappsto();

window.onload = () => {
  wappsto.get(
    "data",
    {},
    {
      expand: 1,
      subscribe: true,
      success: collection => {
        const data = collection.first();
        
        if(data) {
          displayStatus(data);
        }
        
        data.on("change", () => {
          displayStatus(data);
        });
      },
      error: error => {
        console.log(error);
      }
    }
  );
};

const displayStatus = wappstoData => {
  const circle = document.getElementById("circle");
  const detailedStatus = document.getElementById("detailed-status");
  const shortStatus = document.getElementById("short-status");
  
  if(wappstoData.get("status_message")) {
    const status = wappstoData.get("status_message");
    detailedStatus.textContent = "";
    shortStatus.textContent = "";
    
    if(status === "Succesfully converted Netatmo data to Wappsto UDM" || 
       status === "Succesfully updated Wappsto data") {
      shortStatus.textContent = "OK";
      circle.style.backgroundColor = "green";
      // When the status is success then get and display the network data 
      getNetwork();
    }
    
    if(status === "Failed to convert Wappsto data" || 
       status === "Failed to update Wappsto data") {
      shortStatus.textContent = "Error";
      circle.style.backgroundColor = "red";
    }
    detailedStatus.textContent = status;
  }
};

const getNetwork = () => {
  wappsto.get(
    "network",
    { name: "Netatmo Weather Station" },
    {
      expand: 5,
      subscribe: true,
      success: collection => {
        const network = collection.first();

        if(network) {
          displayNetworkData(network);
        }
      },
      error: error => {
        console.log(error);
      }
    }
  );
};

const displayNetworkData = networkToDisplay => {
  const dataContainer = document.getElementById("data-container");
  const devices = networkToDisplay.get("device");
  // Clear the container 
  dataContainer.innerHTML = "";
  
  devices.forEach(device => {
    const values = device.get("value");
    
    values.forEach(value => {
      const valueHeader = `<header>
			<h2> ${value.get("name")} </h2>
			<small> ${device.get("name")} </small>
		</header>`;
      
      let valueIcon;
      
      switch(value.get("name")) {
        case "CO2": 
          valueIcon = "<i class='fab fa-envira'></i>";
          break;
        case "Temperature": 
          valueIcon = "<i class='fas fa-thermometer-three-quarters'></i>";
          break;
        case "Humidity": 
          valueIcon = "<i class='fas fa-tint'></i>";
          break;
        case "Noise": 
          valueIcon = "<i class='fas fa-music'></i>";
          break;
        case "Pressure": 
          valueIcon = "<i class='fas fa-tachometer-alt'></i>";
          break;
        default: 
          valueIcon = "<i class='fas fa-check-circle'></i>";
      }
      
      const stateData = `<p id="state-data"> ${value.get("state").at(0).get("data")} </p>`;

      const stateUnit = `<p id="state-unit"> ${ value.get("number") ? value.get("number").unit : ""} </p>`;

      const timestamp = value.get("state").at(0).get("timestamp");

      const lastUpdated = `<p id="last-updated"> Last updated ${moment(timestamp).fromNow()} </p>`;
      
      dataContainer.innerHTML += `<div class="card">
			${valueHeader} ${valueIcon} ${stateData} ${stateUnit} ${lastUpdated}
		</div>`;
    });
  });
};
