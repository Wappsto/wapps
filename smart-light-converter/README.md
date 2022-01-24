# Hue converter example application

Hue converter is an application that imports all your hue bridge's devices to Wappsto.

# How to use the code:

In order for this application to work, you have to go to [meethue developer website](https://developers.meethue.com/my-apps/) and create your remote application.

Fill the empty fields and set the **callback** url to: https://light.wappsto.com/third_auth/callback.html

After creating your meethue application, you will get a **ClientId** and **ClientSecret** back.

Use your data in your app(foreground/index.js and background/main.js).
