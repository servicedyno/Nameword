const { generateSSHKeyPair, getUserSSHKeys, revokeSSHKey, getSSHKey, checkSSHConnection, setPasswordOnVM, checkSSHConnectionWithPassword, checkSSHConnectionWithSSHKeyName, getSSHKeysForUser, deleteSSHKey, downloadSSHKey, uploadSSHKey } = require("../../app/controllers/ssh-keys/sshKeys");
const { getSSHDataMiddleware } = require("../../app/middlewares/ssh");
const { getUserDataMiddleware } = require("../../app/middlewares/user");
const validateRequest = require("../../app/middlewares/validate-request");
const { sshKeyNameValidation, uploadSSHKeyValidation, sshPasswordValidation, sshKeyNameQueryValidation } = require("../../app/validations/sshKeysRules");

// Set up multer storage configuration
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

const router = require("express").Router();
// const validateRequest = require('../../app/middlewares/validate-request');
// const SSHKeysController = require('../../app/controllers/ssh-keys');

// Route to generate a new SSH key for a user
router.post('/generate', sshKeyNameValidation, validateRequest, getUserDataMiddleware,  generateSSHKeyPair );

// Route to get ssh keys for a user
router.get('/retrieve-all', getUserDataMiddleware, getSSHKeysForUser );

// Route to delete ssh keys for a user
router.delete('/ssh-key', sshKeyNameValidation, validateRequest, getUserDataMiddleware, getSSHDataMiddleware, deleteSSHKey );

// Route to upload ssh key for a user
router.post('/upload-key', upload.single('publicKey'), uploadSSHKeyValidation, validateRequest, getUserDataMiddleware,  uploadSSHKey);

// Route to download a ssh key for a user
router.get('/download',  sshKeyNameQueryValidation, validateRequest, getUserDataMiddleware, downloadSSHKey );

// Route to check SSH connection
router.post('/check-ssh-connection', getUserDataMiddleware, checkSSHConnectionWithSSHKeyName );

// Route to check SSH connection
router.post('/check-connection', checkSSHConnection );

// Router to check SSH connection with password
router.post('/check-connection-with-password', checkSSHConnectionWithPassword);

// Route to set password authentication for user
router.post('/set-password', sshPasswordValidation, validateRequest, setPasswordOnVM );


module.exports = router;