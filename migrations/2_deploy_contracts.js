var EthNOS = artifacts.require("./EthNOS.sol");
var EthNOSPaymaster = artifacts.require("./EthNOSPaymaster.sol");

module.exports = async function(deployer, network, accounts)
{
	process.env.NETWORK = deployer.network;

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
	else if (network == "test_with_gsn")
	{
		// TODO:
		// 1. Run Ganache: net=`date "+%j%H%M%S"` && ganache-cli --networkId $net --chainId $net -v
		// 2. Run GSN: gsn start
		// 3. Set below relayHub and forwarder from step 2
		// 4. Run Truffle: truffle console
		// 5. migrate
		relayHub = '0x7497eB06A861b7090C2ec5e7704bDe874e769ea4';
		// const forwarder = require("../build/gsn/Forwarder").address // TODO: or this?
		forwarder = '0x970189a924a3f55Cbb4fC5ac66769713Df1d8902';
		useGSN = true;
	}
	else if (network == "test")
	{
		useGSN = false;
	}
	// TODO: or some with GSN?
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
	var ethNOS = await EthNOS.deployed();

	if (useGSN)
	{
		await deployer.deploy(EthNOSPaymaster);
		var ethNOSPaymaster = await EthNOSPaymaster.deployed();

		await ethNOS.setTrustedForwarder(forwarder);
		await ethNOS.setEthNOSPaymaster(ethNOSPaymaster.address)

		// TODO: Use TokenGasCalculator to calculate these values (they depend on actual code of postRelayedCall).
		var postGasUsage = 42;
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