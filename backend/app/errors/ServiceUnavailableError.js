const CustomError = require('./CustomError');
class ServiceUnavailableError extends CustomError{
    statusCode = 503;
    message= "Service Unavailable";

    constructor(){
        super("Service Unavailable");
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }

    serializeErrors(){
        return [
            {message: this.message}
        ]
    }
}

module.exports = ServiceUnavailableError;