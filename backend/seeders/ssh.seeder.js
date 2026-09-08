const forge = require('node-forge');
const cryptr = require('../app/services/cryptr');

// Function to create SSH key for admin user
const createSSHAdminSeeder = async () => {
    const sshUser = "connect@ssh.com";
    const keypair = forge.pki.rsa.generateKeyPair(2048);
    const publicKey = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, sshUser);
    const privateKey = forge.ssh.privateKeyToOpenSSH(keypair.privateKey);

    return {
        name: "SSH-Admin",
        password: "admin",
        email: "connect@ssh.com",
        username: "ssh-admin",
        sshKeyName: "ssh-admin",
        publicKey,
        privateKey: cryptr.encrypt(privateKey),
    }
}

module.exports = { createSSHAdminSeeder };
