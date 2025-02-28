class ApiError extends Error {
    constructor(statusCode, message) {
      super(message);
      this.statusCode = statusCode;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.log(err);
  
    res.status(statusCode).json({
      status: false,
      statusCode,
      message,
    });
  };
  
  module.exports = { ApiError, errorHandler };
  