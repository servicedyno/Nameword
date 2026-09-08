const CustomError = require('./CustomError');
class BadRequestError extends CustomError{
    statusCode = 400;

    constructor(message){
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }

    serializeErrors(){
        return [
            {message: this.message}
        ]
    }
}

module.exports = BadRequestError;