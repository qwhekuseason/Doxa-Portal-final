const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const CERT_FILE = path.join(__dirname, 'cert.pem');
const KEY_FILE = path.join(__dirname, 'key.pem');

console.log('✨ Generating new SSL certificates manually...');
const attrs = [
    { name: 'commonName', value: 'localhost' }
];
const options = {
    days: 365,
    algorithm: 'sha256',
    // extensions: [{
    //     name: 'subjectAltName',
    //     altNames: [
    //         { type: 2, value: 'localhost' },
    //         { type: 7, value: '127.0.0.1' }
    //     ]
    // }]
};

/*
try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                options.extensions[0].altNames.push({ type: 7, value: net.address });
                console.log('Added IP to SAN:', net.address);
            }
        }
    }
} catch (e) {
    console.warn('Could not detect local IP:', e);
}
*/


(async () => {
    try {
        console.log('Generating with simple options...');
        let pems = selfsigned.generate(attrs, options);
        console.log('Type of pems:', typeof pems);
        if (pems.constructor) console.log('Constructor:', pems.constructor.name);

        if (pems instanceof Promise) {
            console.log('Detected Promise, awaiting...');
            pems = await pems;
        }

        console.log('Keys in pems:', Object.keys(pems || {}));

        if (!pems || !pems.cert) {
            throw new Error('Cert content is missing!');
        }

        fs.writeFileSync(CERT_FILE, pems.cert);
        fs.writeFileSync(KEY_FILE, pems.private);
        console.log('✅ Certificates generated and saved to ' + CERT_FILE);
    } catch (error) {
        console.error('❌ Failed to generate certificates:', error);
    }
})();

