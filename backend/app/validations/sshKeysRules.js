const { body, query } = require('express-validator');

const sshKeyNameValidation = [
    body('sshKeyName')
        .exists().withMessage('SSH key name is required.')
        .isString().notEmpty().withMessage('SSH key name should be a string.')
];

const sshKeyNameQueryValidation = [
    query('sshKeyName')
        .exists().withMessage('SSH key name is required.')
        .isString().notEmpty().withMessage('SSH key name should be a string.')
];

const uploadSSHKeyValidation = [
    // Validate SSH Key Name
    body("sshKeyName")
        .exists().withMessage("SSH key name is required.")
        .isString().notEmpty().withMessage("SSH key name should be a string."),

    // Custom validation for Public Key (Body or File)
    body("publicKey")
        .optional()
        .isString().notEmpty().withMessage("Public key should be a string."),

    (req, res, next) => {
        // Ensure either `publicKey` (body) or `req.file` (multipart form-data) exists
        if (!req.body.publicKey && !req.file) {
            return res.status(400).json({
                errors: [{ msg: "Public key is required." }]
            });
        }
        next();
    }
];

const sshPasswordValidation = [
    body('host')
        .exists().withMessage('Host is required.')
        .isString().notEmpty().withMessage('Host should be a string.'),

    body('targetUsername')
        .exists().withMessage('Target username is required.')
        .isString().notEmpty().withMessage('Username should be a string.'),

    body('targetPassword')
        .exists().withMessage('Password is required.')
        .isStrongPassword({
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        }).withMessage('Password must be at least 8 characters long and include at least one lowercase letter, one uppercase letter, one number, and one symbol.')
]

// Exporting the validation rule
module.exports = {
    sshKeyNameValidation,
    sshKeyNameQueryValidation,
    uploadSSHKeyValidation,
    sshPasswordValidation
};