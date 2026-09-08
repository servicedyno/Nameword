const CustomError = require('./CustomError');
class NotAuthorizedError extends CustomError{
    statusCode = 401;

    constructor(){
        super('Not authorized');
        Object.setPrototypeOf(this, NotAuthorizedError.prototype);
    }

    serializeErrors(){
        return [
            {message: "Unauthorized"}
        ]
    }
}

module.exports = NotAuthorizedError;