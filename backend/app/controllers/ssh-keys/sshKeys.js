const forge = require('node-forge');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('../../models/User');
const SSHKey = require('../../models/SSHKeys');
const { Client } = require('ssh2');
const cryptr = require('../../services/cryptr');
const Admin = require('../../models/Admin');
const VM = require('../../models/VM');
const VPS = require('../../models/VPS');

// Function to generate SSH key pair
async function generateSSHKeyPair(req, res) {
    try {
        const { sshKeyName } = req.body;
        const user = req.user;
        const userId = user._id;
        // Check if sshKeyName already exists for the user
        const existingKey = await SSHKey.findOne({ userId, sshKeyName });
        if (existingKey) {
            return res.status(400).json({ message: 'SSH key name already exists, please try another one.', success: false });
        }

        // Generate SSH key pair using the user's username or email
        const sshUser = user.email || user.name;
        const keypair = forge.pki.rsa.generateKeyPair(2048);
        const publicKey = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, sshUser);
        const privateKey = forge.ssh.privateKeyToOpenSSH(keypair.privateKey);

        // Extract username from the public key using '@'
        const tempkey = publicKey.split('@')[0];
        const username = tempkey.split(' ').pop();
        console.log(JSON.stringify(privateKey));

        // Create a new SSHKey document
        const newSSHKey = new SSHKey({
            userId,
            publicKey,
            privateKey: cryptr.encrypt(privateKey),
            sshKeyName,
            username
        });

        // Save the SSH key to the database
        await newSSHKey.save();

        // Respond with the generated public key
        res.status(201).json({ message: `SSH key '${sshKeyName}' generated successfully.`, sshKeyName, username });
    } catch (error) {
        console.error('Error generating SSH key:', error);
        res.status(500).json({ message: `Error generating SSH key: ${error.message}`, success: false });
    }
}

// Function to get all SSH keys for a user
async function getSSHKeysForUser(req, res) {
    try {
        const userId = req.user?._id;
        const { vps_id } = req.query; // Get instanceName from query params

        let sshKeys;

        if (vps_id) {
            // ✅ If `instanceName` is provided, find the VM
            const vps = await VPS.findOne({ userId, _id: vps_id });

            if (!vps) {
                return res.status(404).json({
                    message: `VPS '${instanceName}' not found for the user.`,
                    success: false
                });
            }

            // ✅ Fetch only SSH keys linked to this VM
            sshKeys = await SSHKey.find({ userId, sshKeyName: { $in: vps.sshKeys } });
        } else {
            // ✅ If `instanceName` is NOT provided, fetch all SSH keys for the user
            sshKeys = await SSHKey.find({ userId });
        }

        // ✅ Format Response
        const data = {
            count: sshKeys.length,
            keys: sshKeys.map(key => ({
                id: key.id,
                name: key.sshKeyName, // Assuming SSH key name is stored as `sshKeyName`
                publicKey: key.publicKey,
                privateKey: key.privateKey ? cryptr.decrypt(key.privateKey) : null,
                createdAt: key.createdAt,
                updatedAt: key.updatedAt
            }))
        };

        res.status(200).json({ message: 'SSH keys fetched successfully.', data, success: true });
    } catch (error) {
        console.error('Error fetching SSH keys:', error);
        res.status(500).json({ message: `Error fetching SSH keys: ${error.message}`, success: false });
    }
}

// Function to delete an SSH key
async function deleteSSHKey(req, res) {
    try {
        const userId = req.userId;
        const { sshKeyName } = req.body;

        // Delete the SSH key from the database
        const result = await SSHKey.deleteOne({ userId, sshKeyName });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'SSH key not found.', success: false });
        }

        res.status(200).json({ message: 'SSH key deleted successfully.', success: true });
    } catch (error) {
        console.error('Error deleting SSH key:', error);
        res.status(500).json({ message: `Error deleting SSH key: ${error.message}`, success: false });
    }
}

function convertSSH2ToOpenSSH(ssh2Key) {
    let lines = ssh2Key.split("\n").map(line => line.trim());

    // Remove header and footer
    lines = lines.filter(line => !line.startsWith("----") && !line.startsWith("Comment:"));

    // Join all lines into one and add the prefix
    return `ssh-rsa ${lines.join("")}`;
}

// Function to Upload SSH Key
async function uploadSSHKey(req, res) {
    const isFileUploaded = !!req.file?.path;
    const publicKeyPath = req.file?.path;

    try {
        const { sshKeyName } = req.body;
        let publicKey = req.body?.publicKey;

        if (isFileUploaded) {
            publicKey = fs.readFileSync(publicKeyPath, 'utf8').trim();
            publicKey = convertSSH2ToOpenSSH(publicKey);
        }

        const user = req.user;
        const userId = user._id;

        // Check if sshKeyName already exists for the user
        const existingKey = await SSHKey.findOne({ userId, sshKeyName });
        if (existingKey) {
            fs.unlink(publicKeyPath, (err) => {
                if (err) console.error('Error deleting public key file:', err);
            });
            return res.status(400).json({ message: 'SSH key name already exists, please try another one.', success: false });
        }

        // Create a new SSHKey document
        const newSSHKey = new SSHKey({
            userId,
            publicKey,
            privateKey: null,
            sshKeyName,
            username: user.email || user.name
        });

        // Save the SSH key to the database
        await newSSHKey.save();
        // Delete the public key file after saving
        if (isFileUploaded) {
            fs.unlink(publicKeyPath, (err) => {
                if (err) console.error('Error deleting public key file:', err);
            });
        }

        res.status(201).json({ message: `SSH key '${sshKeyName}' uploaded successfully.`, sshKeyName , success: true});
    } catch (error) {
        console.error('Error uploading SSH key:', error);
        if (isFileUploaded) {
            fs.unlink(publicKeyPath, (err) => {
                if (err) console.error('Error deleting public key file:', err);
            });
        }
        res.status(500).json({ message: `Error uploading SSH key: ${error.message}`, success: false });
    }
}

// Function to convert OpenSSH key to PuTTY format
function convertToPuttyFormat(sshKey, sshKeyName) {
    const keyParts = sshKey.split(" ");
    if (keyParts.length < 2) {
        throw new Error("Invalid OpenSSH public key format");
    }

    const keyType = keyParts[0]; // "ssh-rsa" or "ecdsa-sha2-nistp256"
    const keyValue = keyParts[1]; // The actual key data

    return `---- BEGIN SSH2 PUBLIC KEY ----
Comment: "${sshKeyName}"
${chunkString(keyValue, 64)}
---- END SSH2 PUBLIC KEY ----`;
}

// Function to split long SSH key into 64-character lines (PuTTY requires this)
function chunkString(str, length) {
    return str.match(new RegExp(`.{1,${length}}`, 'g')).join("\n");
}

// Function to download the SSH key
async function downloadSSHKey(req, res) {
    try {
        const { sshKeyName, type = "private", format = "putty" } = req.query;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: No user found.', success: false });
        }

        console.log("### USER", req.user);
        console.log("### Requested Type:", type);
        console.log("### Requested Format:", format);

        const userId = user._id;

        // Fetch the SSH key from the database
        const sshKeyDetails = await SSHKey.findOne({ userId, sshKeyName });
        if (!sshKeyDetails) {
            return res.status(404).json({ message: 'SSH key not found.', success: false });
        }

        let keyData, fileName, contentType;

        if (type === "private") {
            // Decrypt and return the private key (.ppk)
            keyData = cryptr.decrypt(sshKeyDetails.privateKey);
            fileName = `${sshKeyName}.ppk`;
            contentType = 'application/octet-stream';

        } else if (type === "public") {
            let publicKey = sshKeyDetails.publicKey;
            if (!publicKey) {
                return res.status(404).json({ message: 'Public key not found.', success: false });
            }

            // Convert public key to PuTTY format if requested
            if (format === "putty") {
                publicKey = convertToPuttyFormat(publicKey, sshKeyName);
                fileName = `${sshKeyName}.pub`;
                contentType = 'text/plain';
            } else {
                fileName = `${sshKeyName}.pub`;
                contentType = 'text/plain';
            }

            keyData = publicKey;

        } else {
            return res.status(400).json({ message: 'Invalid key type. Use "private" or "public".', success: false });
        }

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', contentType);

        // Send the key as a response
        res.status(200).send(keyData);

    } catch (error) {
        console.error('❌ Error downloading SSH key:', error);
        res.status(500).json({ message: `Error downloading SSH key: ${error.message}`, success: false });
    }
}

async function checkSSHConnectionWithSSHKeyName(req, res) {
    try {
        const { sshKeyName, host } = req.body;
        const user = req.user;
        const userId = user._id;

        console.log(`🔹 Checking SSH connection for user: ${userId}, host: ${host}`);

        // Retrieve SSH key details
        const sshKeyDetails = await Admin.findOne({ sshKeyName: "ssh-admin" });

        if (!sshKeyDetails) {
            return res.status(400).json({
                success: false,
                message: 'No SSH key found. Please check the SSH key name and try again.'
            });
        }

        const conn = new Client();

        conn.on('ready', () => {
            console.log('✅ SSH Connection established');

            conn.shell((err, stream) => {
                if (err) {
                    console.error('❌ Shell start error:', err);
                    conn.end();
                    return res.status(500).json({ success: false, message: 'Error starting shell: ' + err.message });
                }

                let output = '';
                let errorOutput = '';

                let pleskLoginUrl = null;
                stream.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    console.log("📜 Output received:", text);

                    // Extract the Plesk login/reset URL from output, ignoring ubuntu.com or other system messages
                    const urlRegex = /https:\/\/[^\s]+/g;
                    const matches = output.match(urlRegex);


                    if (matches) {
                        for (let url of matches) {
                            console.log("###url", url);
                            if (url.includes("login") && url.includes(host)) { // Check for both login and host
                                pleskLoginUrl = url;
                                console.log("###pleskLoginUrl", pleskLoginUrl)
                                conn.end();
                                break;
                            }
                        }
                        // conn.end();
                    }

                    console.log(`🔗 Extracted Plesk Reset Link: ${pleskLoginUrl}`);
                });

                stream.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                    console.error('⚠️ STDERR:', data.toString());
                });

                stream.on('close', () => {
                    console.log('🔚 Shell session closed');
                    conn.end();

                    if (errorOutput) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error executing command.',
                            error: errorOutput
                        });
                    }

                    res.status(200).json({
                        success: true,
                        message: 'SSH connection established successfully.',
                        pleskResetLink: pleskLoginUrl || 'Could not retrieve reset link',
                        fullOutput: output.trim()
                    });
                });

                // Send commands to the shell
                console.log("🚀 Sending commands to SSH session...");
                stream.write("plesk bin admin --get-login-link\r\n");  // Direct sudo command
                // stream.write("sudo plesk bin admin --get-login-link\n");  // Direct sudo command
                stream.write("exit\n");  // Exit shell
            });

        }).on('error', (err) => {
            console.error('❌ SSH Connection Error:', err);
            res.status(500).json({
                success: false,
                message: 'Error connecting to SSH: ' + err.message
            });
        }).connect({
            host: host,
            port: 22,
            username: sshKeyDetails.username,
            privateKey: cryptr.decrypt(sshKeyDetails.privateKey),
        });

    } catch (error) {
    
        console.error('❌ Error checking SSH connection:', error);
        res.status(500).json({
            success: false,
            message: `Error checking SSH connection: ${error.message}`
        });
    }
}
async function checkSSHConnection(req, res) {
    try {
        const { host, username, privateKey } = req.body;

        const conn = new Client();
        conn.on('ready', () => {
            console.log('SSH Connection established');
            conn.exec('uptime', (err, stream) => {
                if (err) {
                    console.error('Command execution error:', err);
                    conn.end();
                    return res.status(500).json({ message: 'Error executing command: ' + err.message });
                }
                let output = '';
                stream.on('close', (code, signal) => {
                    console.log('Command finished with code:', code);
                    conn.end();
                    res.status(200).json({ message: 'SSH connection established successfully.', output });
                }).on('data', (data) => {
                    output += data.toString();
                }).stderr.on('data', (data) => {
                    console.error('STDERR:', data.toString());
                });
            });
        }).on('error', (err) => {
            console.error('SSH Connection Error:', err);
            res.status(500).json({ message: 'Error connecting to SSH: ' + err.message });
        }).connect({
            host: host,
            port: 22,
            username: username,
            privateKey: privateKey,
        });
    } catch (error) {
        console.error('Error checking SSH connection:', error);
        res.status(500).json({ message: `Error checking SSH connection: ${error.message}` });
    }
}

// Function to check SSH connection with password
async function checkSSHConnectionWithPassword(req, res) {
    try {
        const { host, username, password } = req.body;

        const conn = new Client();
        conn.on('ready', () => {
            console.log('SSH Connection established');
            conn.exec('uptime', (err, stream) => {
                if (err) {
                    console.error('Command execution error:', err);
                    conn.end();
                    return res.status(500).json({ message: 'Error executing command: ' + err.message });
                }
                let output = '';
                stream.on('close', (code, signal) => {
                    console.log('Command finished with code:', code);
                    conn.end();
                    res.status(200).json({ message: 'SSH connection established successfully.', output });
                }).on('data', (data) => {
                    output += data.toString();
                }).stderr.on('data', (data) => {
                    console.error('STDERR:', data.toString());
                });
            });
        }).on('error', (err) => {
            console.error('SSH Connection Error:', err);
            res.status(500).json({ message: 'Error connecting to SSH: ' + err.message });
        }).connect({
            host: host,
            port: 22,
            username: username,
            password: password
        });
    } catch (error) {
        console.error('Error checking SSH connection with password:', error);
        res.status(500).json({ message: `Error checking SSH connection: ${error.message}` });
    }
}

// Function to enable pasword-based login and set a password for the user
async function setPasswordOnVM(req, res) {
    const { host, targetUsername, targetPassword } = req.body;
    const maxAttempts = 10;
    const delayBetweenAttempts = 15000; // 15 seconds

    try {
        // Fetch admin SSH key
        const adminSSHKeyDetails = await Admin.findOne({ sshKeyName: "ssh-admin" });
        if (!adminSSHKeyDetails) {
            return res.status(400).json({ message: 'No SSH key found to perform operation.', success: false });
        }

        let attempts = 0;
        let lastError = null;

        const attemptConnection = async () => {
            return new Promise((resolve, reject) => {
                const conn = new Client();
                
                conn.on('ready', () => {
                    console.log(`✅ SSH connection established on attempt ${attempts + 1}`);
                    
                    // Detect OS
                    conn.exec('systeminfo || cat /etc/*release', (err, stream) => {
                        if (err) {
                            conn.end();
                            return reject(err);
                        }

                        let osInfo = '';

                        stream.on('data', (data) => {
                            osInfo += data.toString();
                        }).on('close', () => {
                            let commands;
                            console.log("###osInfo",osInfo)
                            if (osInfo.toLowerCase().includes('windows')) {
                                // Windows password setup
                                commands = `
                                    net user "${targetUsername}" "${targetPassword}" /add /Y 2>nul || net user "${targetUsername}" "${targetPassword}" &&
                                    net localgroup administrators "${targetUsername}" /add &&
                                    powershell -Command "
                                        if (!(Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*' | Where-Object State -eq 'Installed')) {
                                            Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0;
                                            Start-Sleep -Seconds 5;
                                        }
                                        Start-Service sshd;
                                        Set-Service -Name sshd -StartupType 'Automatic';
                                        New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 -ErrorAction SilentlyContinue;
                                    "
                                `;
                            } else if (osInfo.toLowerCase().includes('ubuntu') || osInfo.toLowerCase().includes('debian')) {
                                // Ubuntu/Debian password setup
                                commands = `
                                    id -u ${targetUsername} >/dev/null 2>&1 || sudo useradd -m ${targetUsername} &&
                                    echo "${targetUsername}:${targetPassword}" | sudo chpasswd &&
                                    sudo usermod -aG sudo ${targetUsername} &&
                                    sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^PubkeyAuthentication no/PubkeyAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config &&
                                     sudo sed -i 's/^ChallengeResponseAuthentication no/ChallengeResponseAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i '/^AuthenticationMethods/d' /etc/ssh/sshd_config &&
                                    echo "AuthenticationMethods any" | sudo tee -a /etc/ssh/sshd_config &&
                                    sudo sed -i '/^Match User specificuser/d' /etc/ssh/sshd_config &&
                                    echo -e "\\nMatch User ${targetUsername}\\n    PasswordAuthentication yes" | sudo tee -a /etc/ssh/sshd_config &&
                                    sudo systemctl restart sshd || sudo service sshd restart || sudo /etc/init.d/sshd restart
                                `;
                            } else if (osInfo.toLowerCase().includes('centos')) {
                                commands = `
                                id -u ${targetUsername} >/dev/null 2>&1 || sudo useradd -m ${targetUsername} &&
                                echo -e "${targetPassword}\\n${targetPassword}" | sudo passwd ${targetUsername} &&
                                sudo usermod -aG wheel ${targetUsername} &&
                                sudo chage -M 99999 ${targetUsername} &&
                                sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config &&
                                sudo sed -i 's/^PubkeyAuthentication no/PubkeyAuthentication yes/' /etc/ssh/sshd_config &&
                                sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config &&
                                sudo sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config &&
                                sudo sed -i 's/^ChallengeResponseAuthentication no/ChallengeResponseAuthentication yes/' /etc/ssh/sshd_config &&
                                sudo sed -i '/^AuthenticationMethods/d' /etc/ssh/sshd_config &&
                                echo "AuthenticationMethods any" | sudo tee -a /etc/ssh/sshd_config &&
                                sudo systemctl restart sshd || sudo service sshd restart || sudo /etc/init.d/sshd restart
                            `;                            
                            } else {
                                // Generic Linux fallback
                                commands = `
                                    id -u ${targetUsername} >/dev/null 2>&1 || sudo useradd -m ${targetUsername} &&
                                    echo "${targetUsername}:${targetPassword}" | sudo chpasswd &&
                                    sudo usermod -aG sudo ${targetUsername} &&
                                    sudo chage -M 99999 ${targetUsername} &&
                                    sudo sed -i 's/^PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^PubkeyAuthentication no/PubkeyAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i 's/^ChallengeResponseAuthentication no/ChallengeResponseAuthentication yes/' /etc/ssh/sshd_config &&
                                    sudo sed -i '/^AuthenticationMethods/d' /etc/ssh/sshd_config &&
                                    echo "AuthenticationMethods any" | sudo tee -a /etc/ssh/sshd_config &&
                                    sudo sed -i '/^Match User specificuser/d' /etc/ssh/sshd_config &&
                                    echo -e "\\nMatch User ${targetUsername}\\n    PasswordAuthentication yes" | sudo tee -a /etc/ssh/sshd_config &&
                                    sudo touch /etc/cloud/cloud-init.disabled &&
                                    sudo systemctl restart sshd || sudo service sshd restart || sudo /etc/init.d/sshd restart
                                `;
                            }

                            conn.exec(commands, (err, stream) => {
                                if (err) {
                                    conn.end();
                                    return reject(err);
                                }

                                let outputData = '';
                                let errorData = '';

                                stream.on('data', (data) => {
                                    outputData += data.toString();
                                    console.log('STDOUT:', data.toString());
                                });

                                stream.stderr.on('data', (data) => {
                                    errorData += data.toString();
                                    console.error('STDERR:', data.toString());
                                });

                                stream.on('close', (code) => {
                                    conn.end();

                                    const hasError = errorData.toLowerCase().includes('error') ||
                                        errorData.toLowerCase().includes('failed') ||
                                        code !== 0;

                                    if (hasError) {
                                        return reject(new Error(`Failed to set password: ${errorData}`));
                                    }

                                    resolve({
                                        success: true,
                                        message: 'Password authentication enabled and password set.',
                                        username: targetUsername,
                                        password: targetPassword,
                                        sshConnectionLink: `${targetUsername}@${host}`,
                                        output: outputData
                                    });
                                });
                            });
                        });
                    });
                });

                conn.on('error', (err) => {
                    console.error(`❌ SSH connection error on attempt ${attempts + 1}:`, err.message);
                    lastError = err;
                    reject(err);
                });

                conn.connect({
                    host: host,
                    port: 22,
                    username: adminSSHKeyDetails.username,
                    privateKey: cryptr.decrypt(adminSSHKeyDetails.privateKey),
                });
            });
        };

        while (attempts < maxAttempts) {
            try {
                const result = await attemptConnection();
                return res.status(200).json(result); // Success response
            } catch (error) {
                console.warn(`🚨 Attempt ${attempts + 1}/${maxAttempts} failed: ${error.message}`);
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, delayBetweenAttempts)); // Wait before retrying
                }
            }
        }

        // If all attempts fail, return error response
        return res.status(500).json({
            success: false,
            message: `Failed to establish SSH connection after ${maxAttempts} attempts.`,
            error: lastError ? lastError.message : 'Unknown error'
        });

    } catch (error) {
        console.error('Error setting password:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set password',
            details: error.message || error
        });
    }
}

// Function to store SSH keys in the database
async function storeSSHKey(userId, publicKey, privateKey) {
    // Store the public key and encrypted private key in the database
    // Consider encrypting the private key before storing it
    // await db.storeKey(userId, publicKey, privateKey);
}

// Export the functions for use in other modules
module.exports = {
    generateSSHKeyPair,
    getSSHKeysForUser,
    deleteSSHKey,
    uploadSSHKey,
    downloadSSHKey,
    checkSSHConnection,
    checkSSHConnectionWithSSHKeyName,
    checkSSHConnectionWithPassword,
    setPasswordOnVM,
    storeSSHKey
};