const axios = require("axios");
const BASE_URL = process.env.BASE_URL;

const machineSave = async (deviceUuid, deviceNo) => {
  try {
    const dataToSend = {
      deviceUuid, // Use camelCase if the API expects it
      deviceNo,
      instanceId: "",
    };

    const { data } = await axios.post(
      `${BASE_URL}/machine/save`,
      dataToSend, // Directly pass the object
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return data; // Return response data for further use
  } catch (error) {
    console.error("Error in machine save external:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
    }
  }
};

module.exports = machineSave;
