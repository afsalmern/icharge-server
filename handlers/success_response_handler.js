class ApiSuccess {
    constructor(message, data = {}, statusCode = 200) {
      this.status = true;
      this.statusCode = statusCode;
      this.message = message;
      this.data = data;
    }
  }
  
  const sendSuccess = (res, message, data = {}, statusCode = 200) => {
    res.status(statusCode).json(new ApiSuccess(message, data, statusCode));
  };
  
  module.exports = { ApiSuccess, sendSuccess };