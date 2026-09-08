
const { query, param, body } = require('express-validator');
const { checkIfEmailExists, checkIfPasswordMatch, checkIfMobileExists, checkIfAdminEmailExists, checkIfUserNameExists } = require('./custom_rule');

module.exports.registerRules = [
    body('name').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address.")
        .custom(checkIfEmailExists),
    body('mobile').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isMobilePhone('any').withMessage("The mobile field must be a valid number.")
        .custom(checkIfMobileExists),
    body('username').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .custom(checkIfUserNameExists),
    body('password').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isLength({ min: 8 }).withMessage(() => {
            return `Password should be at least 8 character long.`
        })
        .isLength({ max: 64 }).withMessage("Password exceeds the maximum length of 64 characters."),
    body('passwordConfirmation').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .custom(checkIfPasswordMatch),
];

module.exports.telegramRegisterRules = [
    body('telegramId').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
];

module.exports.adminRegisterRules = [
    body('name').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address.")
        .custom(checkIfAdminEmailExists),
    body('password').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isLength({ min: 8 }).withMessage("Password should be at least 8 character long.")
        .isLength({ max: 64 }).withMessage("Password exceeds the maximum length of 64 characters."),
    body('passwordConfirmation').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .custom(checkIfPasswordMatch),
];

module.exports.loginRules = [
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
    body('password').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.TwoFactorVerifyRules = [
    body('token').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
];

module.exports.emailRules = [
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
];

module.exports.sendMobileOtpRules = [
    body('mobile').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isMobilePhone().withMessage("The mobile field must be a valid phone number."),
];

module.exports.verifyMobileOtpRules = [
    body('mobile').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isMobilePhone().withMessage("The mobile field must be a valid phone number."),
    body('otp').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isNumeric().withMessage("The otp field must be a numeric value")
        .isLength({ min: 6, max: 6 }).withMessage("The OTP should be 6 digits")
];

module.exports.changeEmail = [
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
    body('id').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isMongoId().withMessage("Invalid user id.")
];
module.exports.verifyEmailRules = [
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
    body('otp').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isNumeric().withMessage("The otp field must be a numeric value")
        .isLength({ min: 4, max: 4 }).withMessage("The OTP should be 4 digits")
];

module.exports.passwordResetRules = [
    // body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
    //     .isEmail().withMessage("The email field must be a valid email address."),
    body('password').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isLength({ min: 8, max: 20 }).withMessage("Password should be between 8-20 chars"),
    body('passwordConfirmation').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .custom(checkIfPasswordMatch),
    body('token').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.changePasswordRules = [
    body('oldPassword').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    body('newPassword').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isLength({ min: 8, max: 20 }).withMessage("Password should be between 8-20 chars"),
    body('newPasswordConfirmation').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .custom(checkIfPasswordMatch),
]

module.exports.updateUserDetailsRules = [
    body("name").optional().trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters long.")
        .isString().withMessage("Name must be a valid string."),

    body("email").optional().trim().isEmail().withMessage("The email must be a valid email address."),
    body("mobile").optional().trim().isMobilePhone('any', { strictMode: true }).withMessage("The mobile field must be a valid number."),
    body("username").optional().trim().isLength({ min: 2 }).withMessage("Username must be at least 2 characters long.")
        .isString().withMessage("Username must be a valid string."),
    body('enabled2FA').optional().trim().isBoolean().withMessage((_, { path }) => `The ${path} field should be true or false.`),
    body('notifyEmail').optional().trim().isBoolean().withMessage((_, { path }) => `The ${path} field should be true or false.`),
    body('notifySMS').optional().trim().isBoolean().withMessage((_, { path }) => `The ${path} field should be true or false.`),
];

module.exports.accountReactivateRules = [
    body('email').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isEmail().withMessage("The email field must be a valid email address."),
    body('token').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
]

module.exports.domainSearchRules = [
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('renewalFeePerc').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('transferFeePerc').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('registrationFeePerc').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
];

module.exports.domainOrderRules = [
    query('productType').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('duration').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('isWhoisProtection').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isBoolean().withMessage((_, { path }) => `The ${path} field should be true or false.`),
    query('ns1').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('ns2').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('id').trim().optional()
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('handle').trim().optional(),
    query('isEnablePremium').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isIn([1, 0]).withMessage((_, { path }) => `The ${path} should be 1 or 0.`),
];

module.exports.domainTLDOrderRules = [
    ...this.domainOrderRules,
    query('isUs').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('appPurpose').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .toUpperCase()
        .isIn(['P1', 'P2', 'P3', 'P4']).withMessage((_, { path }) => `The ${path} should be P1, P2, P3 or P4.`),
    query('nexusCategory').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .toUpperCase()
        .isIn(['C11', 'C12', 'C21', 'C31/CC', 'C32/CC']).withMessage((_, { path }) => `The ${path} should be C11, C12, C21, C31/CC orC32/CC'`),
];


module.exports.domainTransferRules = [
    query('orderType').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('isWhoisProtection').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isBoolean().withMessage((_, { path }) => `The ${path} field should be true or false.`),
    query('authCode').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('id').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
];

module.exports.domainRenewRules = [
    query('orderType').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('isWhoisProtection').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isBoolean().withMessage((_, { path }) => `The ${path} field should be true or false.`),
    query('duration').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('id').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
];


module.exports.mongoIdRules = [
    param('id').trim().isMongoId().withMessage((_, { path }) => `The ${path} field is not valid.`)
];

module.exports.getMongoIdRule = (field) => {
    return [
        param(field).trim().isMongoId().withMessage((_, { path }) => `The ${path} field is not valid.`)
    ];
};

module.exports.domainSuggestionRules = [
    query('keyword').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage("The limit should be between 1-50.").toInt(),
];

module.exports.domainRequiredRules = [
    query('domain').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.domainRequiredBodyRules = [
    body('domain').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.restoreDNSHistoryRules = [
    body('domain').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    body('historyId').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.domainNameIdRequiredRules = [
    query('domainNameId').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.domainNameIdOptionalRules = [
    query('domainNameId').optional().trim()
];

module.exports.websiteNameRequiredRules = [
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];

module.exports.websiteIDRequiredRules = [
    query('websiteId').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
];


module.exports.addDnsRules = [
    query('dnsZoneId').optional().trim(),
    query('recordName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('recordType').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('recordValue').optional(),
    query('recordPriority').optional(),
    query('recordTTL').optional(),
];

module.exports.modifyDnsRules = [
    query('dnsZoneId').optional().trim(),
    query('dnsZoneRecordId').optional().trim(),
    query('recordName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('recordType').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('recordValue').optional(),
    query('recordTTL').optional(),
];

module.exports.deleteDnsRules = [
    query('dnsZoneId').optional().trim(),
    query('dnsZoneRecordId').optional().trim(),

];

module.exports.addChildNameServerRules = [
    query('domainNameId').optional().trim(),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('hostName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('ipAddress').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isIP().withMessage("IP address is not valid"),
];

module.exports.modifyChildNameServerIPRules = [
    query('domainNameId').optional().trim(),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('hostName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('newIpAddress').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isIP().withMessage("IP address is not valid"),
    query('oldIpAddress').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isIP().withMessage("IP address is not valid"),
];

module.exports.modifyChildNameServerHostRules = [
    query('domainNameId').optional().trim(),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('oldHostName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('newHostName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
];

module.exports.deleteChildNameServerRules = [
    query('domainNameId').optional().trim(),
    query('websiteName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('hostName').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
];

module.exports.setDomainForwardRules = [
    query('domainNameId').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isInt().withMessage((_, { path }) => `The ${path} field should be integer.`),
    query('websiteId').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
    query('isMasking').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`)
        .isIn([1, 0]).withMessage((_, { path }) => `The ${path} should be 1 or 0.`),
    query('rewrite').trim().notEmpty().withMessage((_, { path }) => `The ${path} field is required.`),
];

module.exports.updateUserRules = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2 }).withMessage("Name must be at least 2 characters long.")
        .isString().withMessage("Name must be a valid string."),

    body("email")
        .optional()
        .trim()
        .isEmail().withMessage("The email must be a valid email address."),

    body("banned")
        .optional()
        .isBoolean().withMessage("Banned must be a boolean value (true/false)."),
];