const { body, query, param } = require('express-validator');

const instanceConfigurationRules = [
    body('name').isString().notEmpty().withMessage('Name is required and should be a string.'),
    body('diskSizeGB').isInt({ min: 1 }).withMessage('Disk size must be a positive integer.'),
    // body('sourceImage').isString().notEmpty().withMessage('Source image is required and should be a string.'),
    body('autoDelete').isBoolean().withMessage('Auto delete must be a boolean.'),
    body('boot').isBoolean().withMessage('Boot must be a boolean.'),
    body('diskType').isString().notEmpty().withMessage('Disk type is required and should be a string.'),
    body('machineType').isString().notEmpty().withMessage('Machine type is required and should be a string.'),
    body('networkName').isString().notEmpty().withMessage('Network name is required and should be a string.'),
    body('googleConsoleProjectId').isString().notEmpty().withMessage('Google Console Project ID is required and should be a string.'),
    body('zone').isString().notEmpty().withMessage('Zone is required and should be a string.')
];

const vpsConfigurationRules = [
    body('label').isString().trim().notEmpty().withMessage('Label is required and should be a string.'),
    body('vps_name').isString().trim().notEmpty().withMessage('VPS Name is required and should be a string.'),
    body('planId').isString().trim().notEmpty().withMessage('Plan Id is required and should be a string.'),
    body('billingCycleId').isString().trim().notEmpty().withMessage('Billing Cycle Id is required and should be a string.'),
    body('cPanelPlanId').optional().isString().trim().notEmpty().withMessage('CPanel Plan Id should be a string if provided.'),
    body('osId').isString().trim().notEmpty().withMessage('OS Id is required and should be a string.'),
    body('diskTypeId').isString().trim().notEmpty().withMessage('Disk Type Id is required and should be a string.'),
    body("networkName").optional().isString().trim().notEmpty().withMessage("Network name must be a non-empty string."),
    body("telegramBotToken").optional().isString().trim().notEmpty().withMessage("Telegram Token must be string"),
    body("price").optional().isFloat({ gt: 0 }).withMessage("Price must be a number greater than 0"),
    body('boot').optional().isBoolean().withMessage('Boot must be a boolean.').default(true),
    body('zone').isString().notEmpty().withMessage('Zone is required and should be a string.'),
    body('googleConsoleProjectId').isString().notEmpty().withMessage('Google Console Project ID is required and should be a string.'),
    body('autoRenewable').optional().isBoolean().withMessage('Auto renewable must be a boolean.').default(false),
    body('autoDelete').optional().isBoolean().withMessage('Auto delete must be a boolean.').default(false),
];

const instanceRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string'),
    body('project').isString().withMessage('Project ID must be a string'),
];

const vpsIdParamsRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string')
]

const upgradeVPSRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string'),
    body('new_plan_id').isString().withMessage('Plan ID must be a string'),
    body("new_plan_price").optional().isFloat({ gt: 0 }).withMessage("Price must be a number greater than 0"),
    body('projectId').isString().notEmpty().withMessage('Google Console Project ID is required and should be a string.')
]

const upgradeDiskRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string'),
    body('new_disk_id').isString().withMessage('Disk ID must be a string'),
    body("new_disk_price").optional().isFloat({ gt: 0 }).withMessage("Price must be a number greater than 0"),
    body('projectId').isString().notEmpty().withMessage('Google Console Project ID is required and should be a string.')
]

const getInstanceRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string'),
    query('project').isString().withMessage('Project ID must be a string'),
];

const deleteInstanceRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string'),
    body('project').isString().withMessage('Project ID must be a string')
];

const listInstancesRules = [
    query('project').isString().withMessage('Project ID must be a string'),
];

const generateReportRules = [
    body('vmId')
        .notEmpty().withMessage('VM ID is required.')
        .isString().withMessage('VM ID must be a string.'),
    body('startDateTime')
        .notEmpty().withMessage('Start date and time are required.')
        .isISO8601().withMessage('Start date and time must be in ISO 8601 format.'),
    body('endDateTime')
        .notEmpty().withMessage('End date and time are required.')
        .isISO8601().withMessage('End date and time must be in ISO 8601 format.')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.startDateTime)) {
                throw new Error('End date and time must be after start date and time.');
            }
            return true;
        }),
];

const checkProjectId = [
    query('projectId')
        .notEmpty().withMessage('Project ID is required.')
        .isString().withMessage('Project ID must be a string.'),
];

const checkProjectIDAndArea = [
    query('projectId')
        .notEmpty().withMessage('Project ID is required.')
        .isString().withMessage('Project ID must be a string.'),
    query('area')
        .notEmpty().withMessage('Area is required.')
        .isString().withMessage('Project ID must be a string.'),
]

const zoneListRules = [
    query('projectId')
        .notEmpty().withMessage('Project ID is required.')
        .isString().withMessage('Project ID must be a string.'),
    query('region')
        .notEmpty().withMessage('Region is required.')
        .isString().withMessage('Region must be a string.'),
];

const attachSSHKeysRules = [
    param('vps_id').isString().withMessage('VPS ID must be a string'),
    body('project')
       .notEmpty().withMessage('Project ID is required.')
       .isString().withMessage('Project ID must be a string.'),
    body('zone')
       .notEmpty().withMessage('Zone is required.')
       .isString().withMessage('Zone must be a string.'),
    body('sshKeys')
       .isArray().withMessage('SSH keys must be an array.'),
];

module.exports = {
    instanceConfigurationRules,
    vpsConfigurationRules,
    instanceRules,
    deleteInstanceRules,
    listInstancesRules,
    getInstanceRules,
    generateReportRules,
    checkProjectId,
    checkProjectIDAndArea,
    zoneListRules,
    attachSSHKeysRules,
    vpsIdParamsRules,
    upgradeVPSRules,
    upgradeDiskRules
};