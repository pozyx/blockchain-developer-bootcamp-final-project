const { GsnTestEnvironment } = require("@opengsn/cli/dist/GsnTestEnvironment");
const EthNOS = artifacts.require("./EthNOS.sol");
const EthNOSPaymaster = artifacts.require("./EthNOSPaymaster.sol");

module.exports = async function(deployer, network, accounts)
{
	process.env.NETWORK = deployer.network; // to be used in tests

	let relayHub;
	let forwarder;
	let useGSN;

	if (network == "live" || network == "live-fork")
	{
		// from https://docs.opengsn.org/contracts/addresses.html#ethereum
		relayHub = '0x9e59Ea5333cD4f402dAc320a04fafA023fe3810D';
		forwarder = '0xAa3E82b4c4093b4bA13Cb5714382C99ADBf750cA';
		useGSN = true;
	}
	else if (network == "ropsten" || network == "ropsten-fork")
	{
		// from https://docs.opengsn.org/contracts/addresses.html#ethereum
		relayHub = '0xAa3E82b4c4093b4bA13Cb5714382C99ADBf750cA';
		forwarder = '0xeB230bF62267E94e657b5cbE74bdcea78EB3a5AB';
		useGSN = true;
	}
	else if (network == "rinkeby" || network == "rinkeby-fork")
	{
		// from https://docs.opengsn.org/contracts/addresses.html#ethereum
		relayHub = '0x6650d69225CA31049DB7Bd210aE4671c0B1ca132';
		forwarder = '0x83A54884bE4657706785D7309cf46B58FE5f6e8a';
		useGSN = true;
	}
	else if (network == "test_with_gsn")
	{
		const env = await GsnTestEnvironment.startGsn('localhost');
		forwarder = env.contractsDeployment.forwarderAddress;
		relayHub = env.contractsDeployment.relayHubAddress;
		useGSN = true;
	}
	else if (network == "test")
	{
		useGSN = false;
	}
	else if (network == "develop" || network == "development")
	{
		useGSN = false;
	}
	else
	{
		console.error(`Unsupported network (${network}) - nothing was deployed!`);
		return;
	}

	await deployer.deploy(EthNOS);
	const ethNOS = await EthNOS.deployed();

	if (useGSN)
	{
		await deployer.deploy(EthNOSPaymaster);
		const ethNOSPaymaster = await EthNOSPaymaster.deployed();

		await ethNOS.setTrustedForwarder(forwarder);
		await ethNOS.setEthNOSPaymaster(ethNOSPaymaster.address)

		// TODO: Use TokenGasCalculator to calculate these values (they depend on actual code of postRelayedCall).
		const postGasUsage = 42;
		await ethNOSPaymaster.setPostGasUsage(postGasUsage);
		await ethNOSPaymaster.setRelayHub(relayHub);
		await ethNOSPaymaster.setTrustedForwarder(forwarder);
		await ethNOSPaymaster.setEthNOS(ethNOS.address);

		console.log(`Deployed EthNOS at ${ethNOS.address} with forwarder ${forwarder} and paymaster ${ethNOSPaymaster.address}`);
		console.log(`Deployed EthNOSPaymaster at ${ethNOSPaymaster.address} with relay hub ${relayHub} with forwarder ${forwarder} and with postGasUsage ${postGasUsage}`);
	}
	else
	{
		console.log(`Deployed EthNOS at ${ethNOS.address}`);
	}
};