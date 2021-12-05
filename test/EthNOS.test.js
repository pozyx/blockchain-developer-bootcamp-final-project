const { RelayProvider } = require("@opengsn/provider/dist");
const ethers = require("ethers");
const EthNOS = artifacts.require("EthNOS.sol");
const EthNOSPaymaster = artifacts.require("EthNOSPaymaster.sol");
const BN = web3.utils.BN;
const { catchRevert } = require("./exceptionsHelpers.js");

contract("EthNOS", async accounts =>
{
    const useGSN = process.env.NETWORK == "test_with_gsn";

    const emptyDocument   = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const sampleDocument1 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53";

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

        // describe("submitDocument", () =>
        // {
        //     //--

        //     it()

        //     it("should error on invalid document hash", async () =>
        //     {
        //         await ethNOS.submitDocument(
        //             emptyDocument,
        //             [accounts[1]]);
        //     });


        // });

        // TODO: temporary
        describe("TMP - without GSN", () =>
        {
            it("Should not forwarder", async () =>
            {
                assert.equal(await ethNOS.trustedForwarder(), '0x0000000000000000000000000000000000000000', "forwarder is set unexpectedly");
            });

            it("signDocument direct", async () =>
            {
                // assert.equal(await ethNOS.signDocumentCalled(), false, "signDocumentCalled set before");

                await ethNOS.signDocument('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');

                // assert.equal(await ethNOS.signDocumentCalled(), true, "signDocumentCalled not set");
            });
        });
    }
    else
    {
        // TODO:

        // TODO: temporary
        describe("TMP - with GSN", () =>
        {
            const callSignDocumentThroughGsn = async (contract, provider) =>
            {
                const transaction = await contract.signDocument('0xcec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
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

            it("fundDocumentSigning", async () =>
            {
                await ethNOS.submitDocument('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', [accounts[1]]);
                const originalFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                await ethNOS.fundDocumentSigning('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', {value: 5})
                const newFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                assert.equal(newFunds.sub(originalFunds).toNumber(), 5, "not funded");
                const newFundsDirect = await ethNOS.getDocumentSigningBalance('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                assert.equal(newFundsDirect, 5, "not funded (direct)");
            });

            it("withdrawFunds", async () =>
            {
                await ethNOS.submitDocument('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', [accounts[1]]);
                await ethNOS.fundDocumentSigning('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', {value: web3.utils.toWei('2')})
                const originalFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                const meOriginalFunds = new BN(await web3.eth.getBalance(accounts[0]));
                const originalFundsDirect = await ethNOS.getDocumentSigningBalance('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                assert.equal(originalFundsDirect, web3.utils.toWei('2'), "not funded (direct)");
                await ethNOS.withdrawDocumentSigningBalance('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                const newFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                const meNewFunds = new BN(await web3.eth.getBalance(accounts[0]));
                const newFundsDirect = await ethNOS.getDocumentSigningBalance('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                assert.isTrue(originalFunds.sub(newFunds).eq(new BN(web3.utils.toWei('2'))), "not withdrawn from there");
                assert.equal(meNewFunds.sub(meOriginalFunds).cmp(new BN(web3.utils.toWei('1.9'))), 1, "not withdrawn to me");
                assert.equal(newFundsDirect, 0, "not widthdrawn (direct)");
            });

            it("signDocument", async () =>
            {
                const provider = new ethers.providers.Web3Provider(
                    await RelayProvider.newProvider(
                    {
                        provider: web3.currentProvider,
				        config: { paymasterAddress: ethNOSPaymaster.address}
                    })
                    .init());

                const account = provider.provider.newAccount();

                await ethNOS.submitDocument('0xcec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', [account.address], {value: web3.utils.toWei('2')});

                // console.log("BEFORE: signDocument " + await ethNOS.signDocumentCalled());
                // console.log("BEFORE: approveRelayedSignDocumentCall " + await ethNOS.approveRelayedSignDocumentCallCalledDocumentHash() + " " + await ethNOS.approveRelayedSignDocumentCallMaxAmountCharged() + " " + await ethNOS.approveRelayedSignDocumentCallOriginalSender());
                // console.log("BEFORE: chargeRelayedSignDocumentCall " + await ethNOS.chargeRelayedSignDocumentCallCalledDocumentHash() + " " + await ethNOS.chargeRelayedSignDocumentCallAmountCharged());
                console.log("BEFORE: balance " + await ethNOS.getDocumentSigningBalance('0xcec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53'));

                const contract = await new ethers.Contract(
                    ethNOS.address,
                    ethNOS.abi,
				    provider.getSigner(
                        account.address,
                        account.privateKey));

                await callSignDocumentThroughGsn(contract, provider);

                // console.log("AFTER: signDocument " + await ethNOS.signDocumentCalled());
                // console.log("AFTER: approveRelayedSignDocumentCall " + await ethNOS.approveRelayedSignDocumentCallCalledDocumentHash() + " " + await ethNOS.approveRelayedSignDocumentCallMaxAmountCharged() + " " + await ethNOS.approveRelayedSignDocumentCallOriginalSender());
                // console.log("AFTER: chargeRelayedSignDocumentCall " + await ethNOS.chargeRelayedSignDocumentCallCalledDocumentHash() + " " + await ethNOS.chargeRelayedSignDocumentCallAmountCharged());
                console.log("AFTER: balance " + await ethNOS.getDocumentSigningBalance('0xcec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53'));

                // assert.equal(await ethNOS.signDocumentCalled(), true, "signDocumentCalled not set");
            });
        });
    }
});
