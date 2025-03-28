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
    throw error;
  }
};

const startRent = async (deviceUuid, battery) => {
  try {
    const dataToSend = {
      deviceUuid,
      battery,
    };

    const { data } = await axios.post(`${BASE_URL}/device/startRent`, dataToSend, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return data?.data;
  } catch (error) {
    console.error("Error in start rent external:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
    }
    throw error;
  }
};

const getDeviceInfoByUuid = async (deviceUuid) => {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/device/getDeviceInfoByUuid`,
      { deviceUuid },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Check if the request was successful
    if (!data || data?.code !== 200) {
      return { success: false, message: data?.msg || "Device info not found", code: data?.code || 500 };
    }

    const device = data.data;

    // Handling different device statuses
    if (device?.deviceState === 0) {
      return { success: false, message: "Device is not active", code: 200 };
    }

    if (device?.deviceSignal === "0") {
      return { success: false, message: "Device is not connected", code: 200 };
    }

    if (device?.networkType === "WIFI" && device?.networkOperator === "Unknown") {
      return { success: false, message: "Device is connected to Wi-Fi but has no internet access", code: 200 };
    }

    if (!device?.deviceIP || device?.deviceIP === "/") {
      return { success: false, message: "Device has no valid IP address", code: 200 };
    }

    // Check if powerbanks are available
    if (!device?.powerbankList || device?.powerbankList.length === 0) {
      return { success: false, message: "No powerbanks available in this device", code: 200 };
    }

    // If everything is fine, return the device info
    return { success: true, device, code: 200 };
  } catch (error) {
    console.error("Error in check device info external:", error.message);
    if (error.response) {
      console.error("Response Data:", error.response.data);
    }
    return { success: false, message: "Internal server error", code: 500 };
  }
};

module.exports = { machineSave, startRent, getDeviceInfoByUuid };
