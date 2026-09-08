const RequestValidationError = require('../errors/RequestValidationError');
const { validationResult } = require('express-validator');

const validateRequest = (req, res, next)=>{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new RequestValidationError(errors.array({ onlyFirstError:true }));
    }
    next();
};

module.exports = validateRequest;