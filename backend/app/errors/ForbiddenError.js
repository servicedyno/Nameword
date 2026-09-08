const CustomError = require('./CustomError');
class ForbiddenError extends CustomError{
    statusCode = 403;

    constructor(message){
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }

    serializeErrors(){
        return [
            {message: this.message}
        ]
    }
}

module.exports = ForbiddenError;