#!/usr/bin/env node

// Inspired by https://github.com/gnosis/run-with-testrpc

const { spawn, execSync } = require('child_process');
const { basename } = require('path');
const fs = require('fs');
require('colors');

const ownName = basename(process.argv[1]);

if(process.argv.length != 3) {
    console.error(
`run with '${ownName} cmd'

Make sure that cmd is a standalone shell argument.

For example: ${ownName} 'truffle migrate && truffle test'
`);
    process.exit(2);
}

// TODO: or npx?
let gsnCmd = 'gsn';
let gsnArgs = ['start'];
const cmd = process.argv[process.argv.length - 1];

let gsn;
new Promise(async (resolve, reject) => {
    const handleError = (err) => {
        if (err.code === 'ENOENT')
            return reject(new Error(`Could not find ${gsnCmd}`));
        if (err.code === 'EACCES')
            return reject(new Error(`Need permission to execute ${gsnCmd}`));
        return reject(err);
    };

    try {
        gsn = spawn(gsnCmd, gsnArgs);
    }
    catch(err) {
        return handleError(err);
    }

    gsn.stdout.on('data', (data) => {
        if (data.includes('Relay is active')) {
            resolve();
        }
    });

    let error = '';

    gsn.stderr.on('data', (data) => {
        error += data;
    });

    gsn.on('error', handleError);

    gsn.on('close', (code) =>
        reject(new Error(`${gsnCmd} exited early with code ${code}`)));
})
.then(() => {
    process.env.GSN_FORWARDER = JSON.parse(fs.readFileSync('./build/gsn/Forwarder.json')).address;
    process.env.GSN_RELAY_HUB = JSON.parse(fs.readFileSync('./build/gsn/RelayHub.json')).address;

    execSync(cmd, { stdio: 'inherit' });
})
.then(() => {
    gsn.kill();
    process.exit();
})
.catch((err) => {
    if(gsn) gsn.kill()
    console.error(`\n  ${err.message.red}\n`);
    process.exit(1);
});