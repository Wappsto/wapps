const config = require("./config");
const axios = require("axios");
// By default, axios serializes JavaScript objects to JSON.
// To send data in the application/x-www-form-urlencoded format instead, use querystring to stringify nested objects!
const querystring = require("querystring");
// Get access token with client credentials grant type - use only for development and testing
const getAccessToken = () => {
  return axios({
    method: "POST",
    headers: {
      Host: "api.netatmo.com",
      "Content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    url: "/oauth2/token",
    baseURL: "https://api.netatmo.com/",
    data: querystring.stringify({
      grant_type: "password",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.username,
      password: config.password,
      scope: "read_station"
    })
  });
};

const getRefreshToken = refreshToken => {
  return axios({
    method: "POST",
    headers: {
      Host: "api.netatmo.com",
      "Content-type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    url: "/oauth2/token",
    baseURL: "https://api.netatmo.com/",
    data: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    })
  });
};

const getStationData = accessToken => {
  return axios({
    method: "GET",
    headers: {
      Host: "api.netatmo.com",
      Authorization: "Bearer " + accessToken
    },
    url: "/getstationsdata",
    baseURL: "https://api.netatmo.com/api/",
    data: querystring.stringify({
      device_id: config.deviceId,
      get_favorites: false
    })
  });
};

module.exports = {
  getAccessToken: getAccessToken,
  getRefreshToken: getRefreshToken,
  getStationData: getStationData
};
