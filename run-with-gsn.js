#!/usr/bin/env node

// Inspired by https://github.com/gnosis/run-with-testrpc

const { execSync } = require('child_process');
const { basename } = require('path');
const { GsnTestEnvironment } = require("@opengsn/cli/dist/GsnTestEnvironment");
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

const cmd = process.argv[process.argv.length - 1];

new Promise(async (resolve, reject) => {
    try {
        const env = await GsnTestEnvironment.startGsn('localhost');
        process.env.GSN_FORWARDER = env.contractsDeployment.forwarderAddress;
        process.env.GSN_RELAY_HUB = env.contractsDeployment.relayHubAddress;
    }
    catch(err) {
        return reject(err);
    }

    resolve();
})
.then(() => {
    execSync(cmd, { stdio: 'inherit' });
})
.then(() => {
    process.exit();
})
.catch((err) => {
    console.error(`\n  ${err.message.red}\n`);
    process.exit(1);
});