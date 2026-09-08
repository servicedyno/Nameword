class ServiceUnavailableError extends Error {
    constructor(message = "Service unavailable") {
      super(message);
      this.name = "ServiceUnavailableError";
      this.statusCode = 503;
    }
  }
  
module.exports = ServiceUnavailableError;