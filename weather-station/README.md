# Weather Station Example Application

## Introduction

This application allows you to connect your Netatmo account and convert your data into the Wappsto Unified Data Model (UDM). It makes use of the [Netatmo Weather API](https://dev.netatmo.com/apidocumentation/weather), as well as the [Wappsto API](https://developer.wappsto.com/), which is made for developing creative IoT solutions.

## How to get started

To get started with using this Wapp you need the following:

* A developer Netatmo account - you can signup for one at the official [Netatmo website](https://auth.netatmo.com/en-us/access/login)
* A Wappsto account
* Netatmo [Smart Home Weather Station](https://www.netatmo.com/en-us/weather/weatherstation) device and optionally one or more Netatmo [Additional Indoor Module](https://www.netatmo.com/en-us/weather/weatherstation/accessories#module) devices

### Setup
1. Login into your Netatmo developer account and create your application. This enables you to get your own **client ID** and **client secret**. 
2. If you haven't done so already, configure your Netatmo devices to function. For detailed instructions, follow this [link](https://helpcenter.netatmo.com/en-us/smart-home-weather-station-and-accessories/setup-installation/how-to-setup-my-smart-home-weather-station).
3. Login into your Wappsto account and create a new Wapp using the files in this GitHub repository.
4. Navigate to the *background* folder and edit the **config.js** by replacing the placeholder values with your own credentials. In the **deviceId** field you need to input your own Weather station MAC address. To find out what your Weather station MAC address is, follow this [link](https://helpcenter.netatmo.com/en-us/smart-thermostat/product-interactions/how-do-i-find-my-products-serial-number-or-its-mac-address).
5. Run the Wapp and allow Wappsto permission to store data in your account .
