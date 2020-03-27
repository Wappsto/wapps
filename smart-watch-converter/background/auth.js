// Implementing the OAuth 2.0 Authorization Code Grant Flow
const axios = require("axios");
const base64 = require("base-64");
const qs = require("qs");

const clientID = "your_clientID";
const clientSecret = "your_clientSecret";
const redirect_uri = "https://light.wappsto.com/third_auth/callback.html";

const authUrl = "https://api.fitbit.com/oauth2/token";

const authHeader = {
  Authorization: "Basic " + base64.encode(clientID + ":" + clientSecret),
  "Content-Type": "application/x-www-form-urlencoded"
};

const getAccessToken = authcode => {
  return axios({
    url: authUrl,
    method: "post",
    headers: authHeader,
    data: qs.stringify({
      client_id: clientID,
      grant_type: "authorization_code",
      redirect_uri: redirect_uri,
      code: authcode
    })
  });
};

const getRefreshToken = refreshToken => {
  return axios({
    url: authUrl,
    method: "post",
    headers: authHeader,
    data: qs.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });
};

const getTokenState = tokenToIntrospect => {
  return axios({
    url: "https://api.fitbit.com/1.1/oauth2/introspect",
    method: "post",
    headers: {
      Authorization: `Bearer ${tokenToIntrospect}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    data: qs.stringify({
      token: tokenToIntrospect
    })
  });
};

module.exports = {
  getAccessToken: getAccessToken,
  getRefreshToken: getRefreshToken,
  getTokenState: getTokenState
};
