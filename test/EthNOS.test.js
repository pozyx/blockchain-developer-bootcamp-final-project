const { RelayProvider } = require("@opengsn/provider/dist");
const ethers = require('ethers');
const EthNOS = artifacts.require("EthNOS.sol");
const EthNOSPaymaster = artifacts.require("EthNOSPaymaster.sol");
const BN = web3.utils.BN;

contract("EthNOS", async accounts =>
{
    const useGSN = process.env.NETWORK == "test_with_gsn";

    let ethNOS;
    let ethNOSPaymaster;

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

        // TODO: temporary
        describe("TMP - without GSN", () =>
        {
            it("Should not forwarder", async () =>
            {
                assert.equal(await ethNOS.trustedForwarder(), '0x0000000000000000000000000000000000000000', "forwarder is set unexpectedly");
            });

            it("signDocumentIfFunded direct", async () =>
            {
                assert.equal(await ethNOS.signDocumentIfFundedCalled(), false, "signDocumentIfFundedCalled set before");

                await ethNOS.signDocumentIfFunded('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');

                assert.equal(await ethNOS.signDocumentIfFundedCalled(), true, "signDocumentIfFundedCalled not set");
            });
        });
    }
    else
    {
        // TODO:

        // TODO: temporary
        describe("TMP - with GSN", () =>
        {
            const callSignDocumentIfFundedThroughGsn = async (contract, provider) =>
            {
                const transaction = await contract.signDocumentIfFunded('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                const receipt = await provider.waitForTransaction(transaction.hash);
                // TODO: parse logs?
                // const result = receipt.logs.
                //     map(entry => contract.interface.parseLog(entry)).
                //     filter(entry => entry != null)[0];
                // return result.values['0']
            };  // callThroughGsn

            it("Should have forwarder", async () =>
            {
                assert.equal(await ethNOS.trustedForwarder(), await ethNOSPaymaster.trustedForwarder(), "forwarder is not set properly");
            });

            it("fundSigning", async () =>
            {
                const originalFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                await ethNOS.fundSigning('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', {value: 5})
                const newFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                assert.equal(newFunds.sub(originalFunds).toNumber(), 5, "not funded");
            });

            it("withdrawFunds", async () =>
            {
                await ethNOS.fundSigning('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', {value: web3.utils.toWei('2')})
                const originalFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                const meOriginalFunds = new BN(await web3.eth.getBalance(accounts[0]));
                await ethNOS.withdrawSigningFunds('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                const newFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                const meNewFunds = new BN(await web3.eth.getBalance(accounts[0]));
                assert.isTrue(originalFunds.sub(newFunds).eq(new BN(web3.utils.toWei('1'))), "not withdrawn from there");
                assert.equal(meNewFunds.sub(meOriginalFunds).cmp(new BN(web3.utils.toWei('0.9'))), 1, "not withdrawn to me");
            });

            it("signDocumentIfFunded", async () =>
            {
                console.log("BEFORE: " + await ethNOS.chargeSignDocumentIfFundedCallCalledDocumentHash() + " " + await ethNOS.chargeSignDocumentIfFundedCallAmountCharged());

                const provider = new ethers.providers.Web3Provider(
                    await RelayProvider.newProvider(
                    {
                        provider: web3.currentProvider,
				        config: { paymasterAddress: ethNOSPaymaster.address}
                    })
                    .init());

                const account = provider.provider.newAccount();

                const contract = await new ethers.Contract(
                    ethNOS.address,
                    ethNOS.abi,
				    provider.getSigner(
                        account.address,
                        account.privateKey));

                await callSignDocumentIfFundedThroughGsn(contract, provider);

                console.log("AFTER: " + await ethNOS.chargeSignDocumentIfFundedCallCalledDocumentHash() + " " + await ethNOS.chargeSignDocumentIfFundedCallAmountCharged());

                assert.equal(await ethNOS.signDocumentIfFundedCalled(), true, "signDocumentIfFundedCalled not set");
            });
        });
    }
});
