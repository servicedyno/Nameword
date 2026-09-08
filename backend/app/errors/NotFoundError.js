const CustomError = require('./CustomError');
class NotFoundError extends CustomError{
    statusCode = 404;

    constructor(message){
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }

    serializeErrors(){
        return [
            {message: this.message}
        ]
    }
}

module.exports = NotFoundError;