var EthNOS = artifacts.require("EthNOS.sol");
var EthNOSPaymaster = artifacts.require("EthNOSPaymaster.sol");

contract("EthNOS", async accounts =>
{
    let ethNOS;
    let ethNOSPaymaster;

    useGSN = process.env.NETWORK == "test_with_gsn";

    if (!useGSN)
    {
        beforeEach(async () =>
        {
            ethNOS = await EthNOS.new();
        });
    }
    else
    {
        beforeEach(async () =>
        {
            ethNOS = await EthNOS.deployed();
            ethNOSPaymaster = await EthNOSPaymaster.deployed();
        });
    }

    if (!useGSN)
    {
        // TODO:
        describe("without GSN", () =>
        {
            // TODO: tmp
            it("Should not forwarder", async () =>
            {
                const ethNOStrustedForwarder = await ethNOS.trustedForwarder();
                const emptyAddress = "0x0000000000000000000000000000000000000000";
                assert.equal(ethNOStrustedForwarder, emptyAddress, "forwarder is set unexpectedly");
            });
        });
    }
    else
    {
        // TODO:
        describe("with GSN", () =>
        {
            // TODO: tmp
            it("Should have forwarder", async () =>
            {
                const ethNOStrustedForwarder = await ethNOS.trustedForwarder();
                const ethNOSPaymasterTrustedForwarder = await ethNOSPaymaster.trustedForwarder();
                assert.equal(ethNOStrustedForwarder, ethNOSPaymasterTrustedForwarder, "forwarder is not set properly");
            });
        });
    }
});
