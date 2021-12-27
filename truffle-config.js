require("dotenv").config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
    networks: {
        local: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
        },
        rinkeby: {
            provider: () =>
                new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`),
            network_id: 4
        },
        mainnet: {
            provider: () =>
                new HDWalletProvider(
                    process.env.MNEMONIC,
                    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`),
            network_id: 1,
            gasPrice: 122000000000, // 122 gwei (current cost in https://ethgasstation.info/)
        },
    },
    mocha: {
        slow: 1000,
        timeout: 10000
    },
    compilers: {
        solc: {
            version: "0.8.11"
        }
    },
};
