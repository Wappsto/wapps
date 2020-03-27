// Functions used to make api calls to the Fitbit Web API using an access token
const axios = require("axios");

const getActivities = accessToken => {
  return axios({
    url: "https://api.fitbit.com/1/user/-/activities/date/today.json",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
};

const getFood = accessToken => {
  return axios({
    url: `https://api.fitbit.com/1.2/user/-/foods/log/date/${formatCurrentDate()}.json`,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
};

const getSleep = accessToken => {
  return axios({
    url: `https://api.fitbit.com/1.2/user/-/sleep/date/${formatCurrentDate()}.json`,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
};

// Return current date in the yyyy-mm-dd format
const formatCurrentDate = () => {
  let currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = currentDate.getMonth() + 1 <= 9 ? `0${currentDate.getMonth() + 1}` : currentDate.getMonth() + 1;
  let day = currentDate.getDate() <= 9 ? `0${currentDate.getDate()}` : currentDate.getDate();
  let formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
};

module.exports = {
  getActivities: getActivities,
  getFood: getFood,
  getSleep: getSleep,
  formatCurrentDate: formatCurrentDate
};
