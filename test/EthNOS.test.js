const { RelayProvider } = require("@opengsn/provider/dist");
const ethers = require("ethers");
const EthNOS = artifacts.require("EthNOS.sol");
const EthNOSPaymaster = artifacts.require("EthNOSPaymaster.sol");
const BN = web3.utils.BN;
const { catchRevert } = require("./exceptionsHelpers.js");
const { advanceTimeAndBlock } = require("./advanceTimeHelper.js");

contract("EthNOS", async accounts => {
    const useGSN = process.env.NETWORK == "test_with_gsn";

    const emptyDocument = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const sampleDocument1 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53";
    const sampleDocument2 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c54";
    const sampleDocument3 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c55";
    const sampleDocument4 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c56";
    const sampleDocument5 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c57";
    const sampleDocument6 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c58";
    const sampleDocument7 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c59";
    const sampleDocument8 = "0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c50";

    const caller = accounts[0];

    const CertificationInfo_submissionTime = 0;
    const CertificationInfo_requiredSignatories = 1;
    const CertificationInfo_certificationTime = 2;
    const SigningInfo_signatory = 0;
    const SigningInfo_signTime = 1;

    let ethNOS;
    let ethNOSPaymaster;

    if (!useGSN) {
        beforeEach(async () => {
            ethNOS = await EthNOS.new();
        });
    }
    else {
        beforeEach(async () => {
            ethNOS = await EthNOS.deployed();
            ethNOSPaymaster = await EthNOSPaymaster.deployed();
        });
    }

    describe("submitDocument", () => {
        it("should revert on invalid document", async () => {
            await catchRevert(
                ethNOS.submitDocument(
                    emptyDocument,
                    [accounts[1]]));
        });

        it("should revert on already submitted document", async () => {
            await ethNOS.submitDocument(
                sampleDocument1,
                [accounts[1]]);

            await catchRevert(
                ethNOS.submitDocument(
                    sampleDocument1,
                    [accounts[1]]));
        });

        // TODO: also amend
        it("should emit DocumentSubmitted, should set submitter and submissionTime", async () => {
            const submitResult = await ethNOS.submitDocument(
                sampleDocument1,
                [accounts[1]]);

            eventEmitted(
                submitResult,
                "DocumentSubmitted",
                { documentHash: sampleDocument1 });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument1);

            assert.equal(
                verifyResult.submitter,
                caller,
                "submitter was not set to caller");

            assert.notEqual(
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                0,
                "currentCertification.submissionTime was not set");
        });

        // TODO: also amend
        it("should set requiredSignatories and certificationState to CertificationPending", async () => {
            await ethNOS.submitDocument(
                sampleDocument2,
                [accounts[1]]);

            const verifyResult = await ethNOS.verifyDocument(sampleDocument2);

            assert.deepEqual(
                verifyResult.currentCertification[CertificationInfo_requiredSignatories],
                [accounts[1]],
                "currentCertification.requiredSignatories was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.CertificationPending,
                "certificationState was not set to CertificationPending");
        });

        // TODO: also amend
        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document without required signatories", async () => {
            const submitResult = await ethNOS.submitDocument(
                sampleDocument3,
                []);

            eventEmitted(
                submitResult,
                "DocumentCertified",
                { documentHash: sampleDocument3 });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument3);

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.certificationTime was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");
        });

        // TODO: also amend
        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document signed by signatory before submission", async () => {
            await ethNOS.signDocument(sampleDocument4, { from: accounts[2] });

            const submitResult = await ethNOS.submitDocument(
                sampleDocument4,
                [accounts[2]]);

            eventEmitted(
                submitResult,
                "DocumentCertified",
                { documentHash: sampleDocument4 });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument4);

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.certificationTime was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");
        });

    });

    describe("amendDocumentSubmission", () => {
        it("should revert on invalid document", async () => {
            await catchRevert(
                ethNOS.amendDocumentSubmission(
                    emptyDocument,
                    [accounts[1]]));
        });

        it("should revert on not yet submitted document", async () => {
            await catchRevert(
                ethNOS.amendDocumentSubmission(
                    sampleDocument5,
                    [accounts[1]]));
        });

        it("should revert on document submitted by someone else", async () => {
            await ethNOS.submitDocument(
                sampleDocument6,
                [accounts[2]],
                { from: accounts[2] });

            await catchRevert(
                ethNOS.amendDocumentSubmission(
                    sampleDocument6,
                    [accounts[1]]));
        });

        it("should emit DocumentSubmissionAmended, should change submissionTime", async () => {
            await ethNOS.submitDocument(
                sampleDocument7,
                [accounts[1]]);

            const verifyResult1 = await ethNOS.verifyDocument(sampleDocument7);

            await advanceTimeAndBlock(1000);

            const amendResult = await ethNOS.amendDocumentSubmission(
                sampleDocument7,
                [accounts[1]]);

            eventEmitted(
                amendResult,
                "DocumentSubmissionAmended",
                { documentHash: sampleDocument7 });

            const verifyResult2 = await ethNOS.verifyDocument(sampleDocument7);

            assert.notEqual(
                verifyResult2.currentCertification[CertificationInfo_submissionTime],
                verifyResult1.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.submissionTime was not changed");
        });

        //--
    });

    function eventEmitted(result, eventName) // + optional { name: value } objects as expected arguments
    {
        const emittedEvents = result.logs.filter(l => l.event === eventName);

        if (emittedEvents.length == 0)
            assert.fail("Expected event '" + eventName + "' emit but did not get one");
        else if (emittedEvents.length > 1)
            assert.fail("Expected 1 event '" + eventName + "' emit but did get " + emittedEvents.length);
        else {
            for (let i = 2; i < arguments.length; i++) {
                const argumentName = Object.keys(arguments[i])[0];
                const argumentValue = arguments[i][argumentName];

                assert.equal(
                    emittedEvents[0].args[argumentName],
                    argumentValue,
                    "Expected event '" + eventName + "' emit with argument '" + argumentName + "' equal to '" + argumentValue + "' but did not get match");
            }
        }
    }

    // TODO: temporary
    if (!useGSN) {
        describe("TMP - without GSN", () => {
            it("Should not forwarder", async () => {
                assert.equal(await ethNOS.trustedForwarder(), '0x0000000000000000000000000000000000000000', "forwarder is set unexpectedly");
            });

            it("signDocument direct", async () => {
                // assert.equal(await ethNOS.signDocumentCalled(), false, "signDocumentCalled set before");

                await ethNOS.signDocument('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');

                // assert.equal(await ethNOS.signDocumentCalled(), true, "signDocumentCalled not set");
            });
        });
    }
    else {
        describe("TMP - with GSN", () => {
            const callSignDocumentThroughGsn = async (contract, provider) => {
                const transaction = await contract.signDocument('0xcec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                const receipt = await provider.waitForTransaction(transaction.hash);
                // TODO: parse logs?
                // const result = receipt.logs.
                //     map(entry => contract.interface.parseLog(entry)).
                //     filter(entry => entry != null)[0];
                // return result.values['0']
            };  // callThroughGsn

            it("Should have forwarder", async () => {
                assert.equal(await ethNOS.trustedForwarder(), await ethNOSPaymaster.trustedForwarder(), "forwarder is not set properly");
            });

            it("fundDocumentSigning", async () => {
                await ethNOS.submitDocument('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', [accounts[1]]);
                const originalFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                await ethNOS.fundDocumentSigning('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', { value: 5 })
                const newFunds = new BN(await web3.eth.getBalance(await ethNOSPaymaster.getHubAddr()));
                assert.equal(newFunds.sub(originalFunds).toNumber(), 5, "not funded");
                const newFundsDirect = await ethNOS.getDocumentSigningBalance('0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53');
                assert.equal(newFundsDirect, 5, "not funded (direct)");
            });

            it("withdrawFunds", async () => {
                await ethNOS.submitDocument('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', [accounts[1]]);
                await ethNOS.fundDocumentSigning('0xaec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', { value: web3.utils.toWei('2') })
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

            it("signDocument", async () => {
                const provider = new ethers.providers.Web3Provider(
                    await RelayProvider.newProvider(
                        {
                            provider: web3.currentProvider,
                            config: { paymasterAddress: ethNOSPaymaster.address }
                        })
                        .init());

                const account = provider.provider.newAccount();

                await ethNOS.submitDocument('0xcec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53', [account.address], { value: web3.utils.toWei('2') });

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
