var EthNOS = artifacts.require("./EthNOS.sol");
var EthNOSPaymaster = artifacts.require("./EthNOSPaymaster.sol");

module.exports = async function(deployer, network, accounts)
{
	// TODO:
	// const forwarder = require("../build/gsn/Forwarder").address
	const forwarder = accounts[5];

	await deployer.deploy(EthNOS);
	var ethNOS = await EthNOS.deployed();

	await deployer.deploy(EthNOSPaymaster);
	var ethNOSPaymaster = await EthNOSPaymaster.deployed();

	await ethNOS.setTrustedForwarder(forwarder);
	await ethNOS.setEthNOSPaymaster(ethNOSPaymaster.address)

	// TODO: Use TokenGasCalculator to calculate these values (they depend on actual code of postRelayedCall).
	var postGasUsage = 42;
	await ethNOSPaymaster.setPostGasUsage(postGasUsage);
	await ethNOSPaymaster.setTrustedForwarder(forwarder);
	await ethNOSPaymaster.setEthNOS(ethNOS.address);

	console.log(`Deployed EthNOS at ${ethNOS.address} with forwarder ${forwarder} and paymaster ${ethNOSPaymaster.address}`);
	console.log(`Deployed EthNOSPaymaster at ${ethNOSPaymaster.address} with forwarder ${forwarder} with postGasUsage ${postGasUsage}`);
};