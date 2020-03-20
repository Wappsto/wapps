# Smart Watch Converter 

## Introduction

This application allows you to connect your Fitbit account and convert your data into the Wappsto Unified Data Model (UDM). It makes use of the [Fitbit Web API](https://dev.fitbit.com/build/reference/web-api/), as well as the [Wappsto API](https://developer.wappsto.com/), which is made for developing creative IoT solutions.

## How to get started

To get started with using this Wapp you need the following:

* A Fitbit account - you can signup for one at the official [Fitbit website](https://www.fitbit.com/signup)
* A Wappsto account
* A Fitbit Smart watch device

### Setup
1. Go to this [link](https://dev.fitbit.com/apps/new) and register your own application. This enables you to get your own **client ID** and **client secret**. In the field *Callback URL* input https://light.wappsto.com/third_auth/callback.html
2. Login into your Wappsto account and create a new Wapp using the files in this GitHub repository.
3. Navigate to the *foreground* folder and edit the **index.js** file by replacing the placeholder value for clientID with your own client ID.
4. Navigate to the *background* folder and edit the **auth.js** file by replacing the placeholder values for clientID and clientSecret with your own credentials. 
5. Run the Wapp, then enable extsync when prompted and allow Wappsto permission to store data in your account .
