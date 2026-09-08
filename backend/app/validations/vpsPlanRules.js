const { body, param } = require('express-validator');

const createVPSPlanRules = [
    body('name')
        .exists().withMessage('VPS plan name is required.')
        .isString().notEmpty().withMessage('VPS plan name should be a string.'),

    body('specs.vCPU')
        .exists().withMessage('vCPU count is required.')
        .isInt({ min: 1 }).withMessage('vCPU must be an integer greater than 0.'),

    body('specs.RAM')
        .exists().withMessage('RAM is required.')
        .isInt({ min: 1 }).withMessage('RAM must be an integer greater than 0.'),

    body('specs.disk')
        .exists().withMessage('Disk size is required.')
        .isInt({ min: 1 }).withMessage('Disk size must be an integer greater than 0.'),

    body('level')
        .exists().withMessage('Plan level is required.')
        .isInt({ min: 1 }).withMessage('Plan level must be a positive integer.'),

    body('upgrade_options')
        .isArray().withMessage('Upgrade options must be an array of plan names.')
        .optional(),

    body('increment')
        .exists().withMessage('Increment is required.')
        .isObject().withMessage('Increment must be an object.')
        .custom((value) => {
            if (!value.unit || !value.value) {
                throw new Error('Increment must have unit and value properties.');
            }
            return true;
        }),

    body('increment.unit')
        .isString().withMessage('Increment unit must be a string.')
        .isIn(['percentage', 'currency']).withMessage('Increment unit must be either "percentage" or "currency."'),

    body('increment.value')
        .isNumeric().withMessage('Increment value must be a number.')
        .isFloat({ min: 0 }).withMessage('Increment value must be a non-negative number.')
        .optional()
];

const updateVPSPlanRules = [
    param('planId')
        .exists().withMessage('Plan ID is required.')
        .isMongoId().withMessage('Invalid Plan ID format.'),

    body('name')
        .exists().withMessage('VPS plan name is required.')
        .isString().notEmpty().withMessage('VPS plan name should be a string.'),

    body('specs.vCPU')
        .optional()
        .isInt({ min: 1 }).withMessage('vCPU must be an integer greater than 0.'),

    body('specs.RAM')
        .optional()
        .isInt({ min: 1 }).withMessage('RAM must be an integer greater than 0.'),

    body('specs.disk')
        .optional()
        .isInt({ min: 1 }).withMessage('Disk size must be an integer greater than 0.'),

    body('level')
        .optional()
        .isInt({ min: 1 }).withMessage('Plan level must be a positive integer.'),

    body('upgrade_options')
        .optional()
        .isArray().withMessage('Upgrade options must be an array of plan names.'),

    body('increment')
        .optional()
        .isObject().withMessage('Increment must be an object.')
        .custom((value) => {
            console.log("###increment",value)
            if (value) {
                if (!value.unit || value.value === undefined) {
                    throw new Error('Increment must have unit and value properties.');
                }
            }
            return true;
        }),

    body('increment.unit')
        .optional() 
        .isString().withMessage('Increment unit must be a string.')
        .isIn(['percentage', 'currency']).withMessage('Increment unit must be either "percentage" or "currency."'),

    body('increment.value')
        .optional() 
        .isNumeric().withMessage('Increment value must be a number.')
        .isFloat({ min: 0 }).withMessage('Increment value must be a non-negative number.')
];

const deleteVPSPlanRules = [
    param('planId')
        .exists().withMessage('Plan ID is required.')
        .isMongoId().withMessage('Invalid Plan ID format.')
];

// Export validation rules
module.exports = {
    createVPSPlanRules,
    updateVPSPlanRules,
    deleteVPSPlanRules
};
