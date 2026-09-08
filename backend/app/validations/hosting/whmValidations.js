
const { body } = require('express-validator');

const installWhmValidation = [
    body('host')
        .trim()
        .notEmpty()
        .withMessage('Host is required')
        .isIP()
        .withMessage('Host must be a valid IP address'),
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isString()
        .withMessage('Username must be a string'),
    // Custom validation for the uploaded private key file
    (req, res, next) => {
        if (!req.file || !req.file.path) {
            return res.status(400).json({
                errors: [
                    {
                        msg: 'Private key file is required',
                        param: 'privateKey',
                        location: 'body',
                    },
                ],
            });
        }
        next();
    },
];

module.exports = {
    // Other validations...
    installWhmValidation,
};
