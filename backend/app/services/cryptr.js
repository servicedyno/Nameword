const Cryptr = require('cryptr');
const env = require('../../start/env');
const cryptr = new Cryptr(env.APP_KEY);
module.exports =  cryptr;

// Usage Example
// const encryption = new Encryption();
// const encrypted = encryption.encryptData('Sensitive Data');
// console.log('Encrypted:', encrypted);
// const decrypted = encryption.decryptData(encrypted);
// console.log('Decrypted:', decrypted);
