const { Client } = require('ssh2');
const fs = require('fs');
const { getOSDetails } = require('../../utils/hosting');
const ComputeEngineController = require('../compute-engine/ComputeEngineController');


// To Install WHM
// const installWHM = async (req, res) => {
//     const { host } = req.body;
//     console.log("DATA", req.sshKeyDetails)
//     const username = req.sshKeyDetails.username;
//     const privateKey = req.sshKeyDetails.privateKey;
//     console.log("###username", username)
//     const conn = new Client();

//     conn.on('ready', async () => {
//         console.log('SSH Client :: ready');

//         // Step 1: Check if WHM is already installed
//         conn.exec('/usr/local/cpanel/cpanel -V', (err, stream) => {
//             if (err) {
//                 console.error('Error checking WHM installation:', err);
//                 return res.status(500).json({ message: 'Error checking WHM installation: ' + err.message });
//             }

//             let isInstalled = false;
//             let checkOutput = '';

//             stream.on('data', (data) => {
//                 checkOutput += data.toString();
//                 console.log('WHM Check Output:', checkOutput);

//                 if (checkOutput.trim()) {
//                     isInstalled = true;
//                 }
//             }).stderr.on('data', (data) => {
//                 console.error('WHM Check STDERR:', data.toString());
//             }).on('close', () => {
//                 if (isInstalled) {
//                     console.log('WHM is already installed:', checkOutput);
//                     conn.end();
//                     return res.status(400).json({
//                         message: 'WHM is already installed.',
//                         version: checkOutput.trim(),
//                     });
//                 }

//                 // Proceed with installation if not installed
//                 console.log('WHM is not installed. Proceeding with installation.');

//                 const defaultPassword = process.env.WHM_DEFAULT_PASSWORD || 'Password@123*456';

//                 // Step 2: Get OS Details
//                 getOSDetails(conn).then((osDetails) => {
//                     console.log('Detected OS:', osDetails);

//                     // Step 3: Determine installation commands based on OS
//                     let installCommands = `
//                         sudo su
//                         echo 'root:${defaultPassword}' | chpasswd
//                         echo 'Root password updated' &&
//                         sudo apt-get update &&
//                         echo 'Starting WHM Installation' &&
//                         cd /home &&
//                         curl -o latest -L https://securedownloads.cpanel.net/latest &&
//                         sh latest && echo 'Installation Completed Successfully on https://${host}:2087'
//                     `;

//                     if (osDetails.includes('Rocky Linux')) {
//                         console.log('Installing WHM on Rocky Linux..');
//                         installCommands = `
//                             sudo su
//                             echo 'root:${defaultPassword}' | chpasswd
//                             echo 'Root password updated' &&
//                             yum -y update &&
//                             yum -y install perl curl &&
//                             iptables-save > ~/firewall.rules &&
//                             systemctl stop firewalld.service &&
//                             systemctl disable firewalld.service &&
//                             echo 'Starting WHM Installation' &&
//                             cd /home &&
//                             curl -o latest -L https://securedownloads.cpanel.net/latest &&
//                             sh latest && echo 'Installation Completed Successfully on https://${host}:2087'
//                         `;
//                     }

//                     conn.shell((err, stream) => {
//                         if (err) {
//                             console.error('Error opening shell:', err);
//                             return res.status(500).json({ message: 'Error opening shell: ' + err.message });
//                         }

//                         let commandOutput = '';
//                         let fatalErrorMessage = '';
//                         let fatalErrorDetected = false;

//                         stream.on('close', (code, signal) => {
//                             conn.end();
//                             console.log('Shell closed with code:', code, 'signal:', signal);

//                             if (!fatalErrorDetected) {
//                                 const whmUri = `https://${host}:2087`;
//                                 res.status(200).json({
//                                     message: 'WHM installation completed successfully.',
//                                     whmUri,
//                                 });
//                             } else {
//                                 console.error('Installation process encountered errors. Output:', commandOutput);
//                                 res.status(500).json({
//                                     message: 'Installation process encountered errors.',
//                                     lastError: fatalErrorMessage?.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ''),
//                                     details: commandOutput,
//                                 });
//                             }
//                         }).on('data', (data) => {
//                             const output = data.toString();
//                             console.log('Shell output:', output);

//                             commandOutput += output;

//                             // Check for the completion message
//                             const successMessageRegex = /Thank you for installing cPanel & WHM/;
//                             if (successMessageRegex.test(output)) {
//                                 fatalErrorDetected = false;
//                                 console.log('WHM Installation Success Message Detected');
//                                 stream.end('exit\n');
//                                 conn.end();
//                             }

//                             // Check for FATAL errors
//                             if (output.includes('FATAL')) {
//                                 console.error('Detected FATAL error in STDOUT:', output);

//                                 const match = output.match(/\(FATAL\): (.+)/);
//                                 if (match && match[1]) {
//                                     fatalErrorMessage = match[1];
//                                 }

//                                 fatalErrorDetected = true;
//                                 stream.end('exit\n');
//                                 conn.end();
//                             }
//                         }).stderr.on('data', (data) => {
//                             const errorOutput = data.toString();
//                             commandOutput += errorOutput;
//                             console.error('STDERR:', errorOutput);
//                             return res.status(500).json({ message: errorOutput });
//                         });

//                         stream.end(installCommands + '\nexit\n');
//                     });
//                 }).catch((osError) => {
//                     console.error('Error detecting OS:', osError);
//                     res.status(500).json({ message: 'Error detecting OS: ' + osError.message });
//                 });
//             });
//         });
//     }).connect({
//         host: host,
//         port: 22,
//         username: username,
//         privateKey: privateKey,
//     });

//     conn.on('error', (err) => {
//         console.error('SSH Connection Error:', err);
//         res.status(500).json({ message: 'Error connecting to VM via SSH: ' + err.message });
//     });
// };

const installWHM = async (req, res) => {
    try {
        console.log("###RUn")
        const instancesClient = await ComputeEngineController.getInstancesClient();
        
        const operationsClient = await ComputeEngineController.getOperationsClient();
        
        const [response] = await instancesClient.insert({
            project: "nameword-435507",
            zone: "us-central1-a",
            instanceResource: {
                "name": "cpanel-vm",
                "machineType": "zones/us-central1-a/machineTypes/e2-medium",
                "disks": [
                    {
                        "boot": true,
                        "initializeParams": {
                            "sourceImage": "projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts"
                        }
                    }
                ],
                "networkInterfaces": [
                    {
                        "network": "global/networks/default",
                        "accessConfigs": [
                            {
                                "type": "ONE_TO_ONE_NAT",
                                "name": "External NAT"
                            }
                        ]
                    }
                ],
                "metadata": {
                    "items": [
                        {
                            "key": "startup-script",
                            "value": "#!/bin/bash\ncurl -o latest -L https://securedownloads.cpanel.net/latest && sh latest"
                        }
                    ]
                }
            },
        });
        let operation = response.latestResponse;
        operation = await ComputeEngineController.waitForOperation(operationsClient, operation, "nameword-435507", "us-central1-a");
        console.log(`Created instance: ${operation.name}`);

    } catch (err) {
        console.log("###err",err)
    };
}
// To Setup WHM License
const setupWHMLicense = (req, res) => {
    const { host } = req.body;
    const username = req.sshKeyDetails.username;
    const privateKey = req.sshKeyDetails.privateKey;
    const conn = new Client();
    let privateKeyContent;

    const licenseSetupCommands = `
        sudo su 
        cd /home &&
        /usr/local/cpanel/cpkeyclt
    `
    conn.on('ready', () => {
        console.log('SSH Client :: ready');

        conn.shell((err, stream) => {
            if (err) {
                console.error('Error starting shell:', err);
                return res.status(500).json({ message: 'Error starting shell: ' + err.message });
            }

            let commandOutput = '';
            let licenseErrorDetected = false;
            let licenseErrorMessage = '';
            let generalErrorMessage = '';

            stream.on('close', (code, signal) => {
                console.log('Shell :: close :: code: ' + code + ', signal: ' + signal);
                conn.end();
                console.log("###connection closed###", licenseErrorDetected);
                if (licenseErrorDetected) {
                    return res.status(400).json({
                        message: 'No valid cPanel/WHM license found.',
                        licenseError: licenseErrorMessage,
                        generalError: generalErrorMessage,
                    });
                }
                console.log("###commandOutput###", commandOutput);
                if (commandOutput.includes('WHM license setup completed')) {
                    return res.status(200).json({ message: 'WHM license setup completed successfully.' });
                }
                // res.status(200).json({ message: 'WHM license setup initiated successfully.' });
            }).on('data', (data) => {
                const output = data.toString();
                console.log('STDOUT: ' + output);
                commandOutput += output;

                if (commandOutput.includes('WHM license setup completed') || commandOutput.includes('Update succeeded')) {
                    commandOutput += 'WHM license setup completed';
                    stream.end('exit\n');
                }

                if (output.includes('Error message:')) {
                    licenseErrorDetected = true;
                    const errorMatch = output.match(/Error message:\s*(.*)/);
                    console.log('General Error:', errorMatch[1]);
                    if (errorMatch && errorMatch[1]) {
                        licenseErrorMessage = errorMatch[1];
                    }
                }

                if (output.includes('The exact message was:')) {
                    licenseErrorDetected = true;
                    const exactMessageMatch = output.match(/The exact message was:\s*(.*)/);
                    console.log('General Error:', exactMessageMatch[1]);
                    if (exactMessageMatch && exactMessageMatch[1]) {
                        generalErrorMessage = exactMessageMatch[1];
                        stream.end('exit\n');
                    }
                }
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data.toString());
            });

            // Write commands to the shell
            stream.end(licenseSetupCommands + '\nexit\n');
        });
    }).connect({
        host: host,
        port: 22,
        username: username,
        privateKey: privateKey,
        tryKeyboard: true
    });

    conn.on('error', (err) => {
        console.error('SSH Connection Error:', err);
        res.status(500).json({ message: 'Error connecting to VM via SSH: ' + err.message });
    });
};

module.exports = {
    installWHM,
    setupWHMLicense
}; 