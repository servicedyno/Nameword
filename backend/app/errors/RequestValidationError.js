const CustomError = require('./CustomError');

class RequestValidationError extends CustomError{
    statusCode = 422;
    constructor(errors){
        super('Invalid request parameters');
        this.errors = errors;
        Object.setPrototypeOf(this, RequestValidationError.prototype);
    }

    serializeErrors(){
		//console.log(this.errors);
        return this.errors.map(error=>{
			
            if(error.type=='field'){
                return { message:error.msg, field:error.path}
            }
        });
    }
}

module.exports = RequestValidationError;