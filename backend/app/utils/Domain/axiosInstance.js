const axios = require("axios"); 

const createAxiosInstance = () => {
  return axios.create({
    timeout: 30000,
  });                                   
};                                                             

module.exports = createAxiosInstance;                