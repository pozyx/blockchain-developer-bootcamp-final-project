var EthNOS = artifacts.require("./EthNOS.sol");

module.exports = function(deployer) {
  deployer.deploy(EthNOS);
};