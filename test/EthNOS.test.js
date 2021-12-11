const { RelayProvider } = require("@opengsn/provider/dist");
const ethers = require("ethers");
const EthNOS = artifacts.require("EthNOS.sol");
const EthNOSPaymaster = artifacts.require("EthNOSPaymaster.sol");
const BN = web3.utils.BN;
const { catchRevert } = require("./exceptionsHelpers.js");
const { advanceTimeAndBlock } = require("./advanceTimeHelpers.js");
const { eventEmitted } = require("./testHelpers.js");

contract("EthNOS", async accounts => {

    // TODO: or pull below up

    const useGSN = process.env.NETWORK == "test_with_gsn";

    const emptyDocument = "0x0000000000000000000000000000000000000000000000000000000000000000";

    function getRandomDocument() {
        return web3.utils.randomHex(32);
    }

    const defaultCaller = accounts[0];

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
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            await catchRevert(
                ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[1]]));
        });

        it("should emit DocumentSubmitted, should set submitter and submissionTime", async () => {
            const sampleDocument = getRandomDocument();

            const submitResult = await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            eventEmitted(
                submitResult,
                "DocumentSubmitted",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.submitter,
                defaultCaller,
                "submitter was not set to caller");

            assert.notEqual(
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                0,
                "currentCertification.submissionTime was not set");
        });

        it("should set requiredSignatories and certificationState to CertificationPending", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.deepEqual(
                verifyResult.currentCertification[CertificationInfo_requiredSignatories],
                [accounts[1]],
                "currentCertification.requiredSignatories was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.CertificationPending,
                "certificationState was not set to CertificationPending");
        });

        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document without required signatories", async () => {
            const sampleDocument = getRandomDocument();

            const submitResult = await ethNOS.submitDocument(
                sampleDocument,
                []);

            eventEmitted(
                submitResult,
                "DocumentCertified",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.certificationTime was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");
        });

        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document signed by signatory before submission", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.signDocument(sampleDocument, { from: accounts[2] });

            const submitResult = await ethNOS.submitDocument(
                sampleDocument,
                [accounts[2]]);

            eventEmitted(
                submitResult,
                "DocumentCertified",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

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
            const sampleDocument = getRandomDocument();

            await catchRevert(
                ethNOS.amendDocumentSubmission(
                    sampleDocument,
                    [accounts[1]]));
        });

        it("should revert on document submitted by someone else", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[2]],
                { from: accounts[2] });

            await catchRevert(
                ethNOS.amendDocumentSubmission(
                    sampleDocument,
                    [accounts[1]]));
        });

        it("should emit DocumentSubmissionAmended, should change submissionTime", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            const verifyResult1 = await ethNOS.verifyDocument(sampleDocument);

            await advanceTimeAndBlock(1000);

            const amendResult = await ethNOS.amendDocumentSubmission(
                sampleDocument,
                [accounts[1]]);

            eventEmitted(
                amendResult,
                "DocumentSubmissionAmended",
                { documentHash: sampleDocument });

            const verifyResult2 = await ethNOS.verifyDocument(sampleDocument);

            assert.notEqual(
                verifyResult2.currentCertification[CertificationInfo_submissionTime],
                verifyResult1.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.submissionTime was not changed");
        });

        it("should set requiredSignatories and certificationState to CertificationPending and reset certificationTime", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                []);

            await ethNOS.amendDocumentSubmission(
                sampleDocument,
                [accounts[2]]);

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.deepEqual(
                verifyResult.currentCertification[CertificationInfo_requiredSignatories],
                [accounts[2]],
                "currentCertification.requiredSignatories was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.CertificationPending,
                "certificationState was not set to CertificationPending");

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                0,
                "currentCertification.certificationTime was not reset");
        });

        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document without required signatories", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            const submitResult = await ethNOS.amendDocumentSubmission(
                sampleDocument,
                []);

            eventEmitted(
                submitResult,
                "DocumentCertified",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.certificationTime was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");
        });

        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document signed by signatory before submission", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.signDocument(sampleDocument, { from: accounts[2] });

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            const submitResult = await ethNOS.amendDocumentSubmission(
                sampleDocument,
                [accounts[2]]);

            eventEmitted(
                submitResult,
                "DocumentCertified",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                "currentCertification.certificationTime was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");
        });

        it("should move current certification information to past certifications on previously certified document", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            await ethNOS.signDocument(sampleDocument, { from: accounts[1] });

            const verifyResult1 = await ethNOS.verifyDocument(sampleDocument);

            await ethNOS.amendDocumentSubmission(
                sampleDocument,
                [accounts[2]]);

            const verifyResult2 = await ethNOS.verifyDocument(sampleDocument);

            assert.deepEqual(
                verifyResult2.pastCertifications[0],
                verifyResult1.currentCertification,
                "currentCertification was not moved to pastCertifications");
        });
    });

    describe("deleteDocumentSubmission", () => {
        it("should revert on invalid document", async () => {
            await catchRevert(
                ethNOS.deleteDocumentSubmission(emptyDocument));
        });

        it("should revert on not yet submitted document", async () => {
            const sampleDocument = getRandomDocument();

            await catchRevert(
                ethNOS.deleteDocumentSubmission(sampleDocument));
        });

        it("should revert on document submitted by someone else", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[2]],
                { from: accounts[2] });

            await catchRevert(
                ethNOS.deleteDocumentSubmission(sampleDocument));
        });

        it("should revert on certified document", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                []);

            await catchRevert(
                ethNOS.deleteDocumentSubmission(sampleDocument));
        });

        it("should emit DocumentSubmissionDeleted, should set certificationState to NotSubmitted, should reset submissionTime and requiredSignatories", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1]]);

            const deleteResult = await ethNOS.deleteDocumentSubmission(sampleDocument);

            eventEmitted(
                deleteResult,
                "DocumentSubmissionDeleted",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.NotSubmitted,
                "certificationState was not set to NotSubmitted");

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_submissionTime],
                0,
                "currentCertification.submissionTime was not reset");

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_requiredSignatories].length,
                0,
                "currentCertification.requiredSignatories was not reset");
        });

        it("should set certificationState to Certified, should move last past certification to current certification on previously certified document", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                []);

            await ethNOS.amendDocumentSubmission(
                sampleDocument,
                [accounts[1]]);

            await ethNOS.signDocument(sampleDocument, { from: accounts[1] });

            const verifyResult2 = await ethNOS.verifyDocument(sampleDocument);

            await ethNOS.amendDocumentSubmission(
                sampleDocument,
                [accounts[2]]);

            const verifyResult3 = await ethNOS.verifyDocument(sampleDocument);

            await ethNOS.deleteDocumentSubmission(sampleDocument);

            const verifyResult4 = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult4.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");

            assert.equal(
                verifyResult4.pastCertifications.length,
                verifyResult3.pastCertifications.length - 1,
                "certification was not moved from pastCertifications (past certifications not popped)");

            assert.deepEqual(
                verifyResult4.currentCertification,
                verifyResult3.pastCertifications[verifyResult3.pastCertifications.length - 1],
                "certification was not moved from pastCertifications (current certification not matching previous last past certification)");

            assert.deepEqual(
                verifyResult4.currentCertification,
                verifyResult2.currentCertification,
                "certification was not moved from pastCertifications (current certification not matching older current certification)");
        });
    });

    describe("signDocument", () => {

        it("should revert on invalid document", async () => {
            await catchRevert(
                ethNOS.signDocument(emptyDocument));
        });

        it("should revert on document already signed by sender", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.signDocument(sampleDocument);

            await catchRevert(
                ethNOS.signDocument(sampleDocument));
        });

        it("should emit DocumentSigned, should add signatory (with signTime) on previously submitted document", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1], accounts[2]]);

            const signResult = await ethNOS.signDocument(
                sampleDocument,
                { from: accounts[1] });

            eventEmitted(
                signResult,
                "DocumentSigned",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.signatures.length,
                1,
                "signatures do not contain one signatuere");

            assert.equal(
                verifyResult.signatures[0][SigningInfo_signatory],
                accounts[1],
                "signature signatory was not set to caller");

            assert.notEqual(
                verifyResult.signatures[0][SigningInfo_signTime],
                0,
                "signature signTime was not set");
        });

        it("should emit DocumentSigned, should add signatory (with signTime) on previously not submitted document", async () => {
            const sampleDocument = getRandomDocument();

            const signResult = await ethNOS.signDocument(
                sampleDocument,
                { from: accounts[1] });

            eventEmitted(
                signResult,
                "DocumentSigned",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.signatures.length,
                1,
                "signatures do not contain one signatuere");

            assert.equal(
                verifyResult.signatures[0][SigningInfo_signatory],
                accounts[1],
                "signature signatory was not set to caller");

            assert.notEqual(
                verifyResult.signatures[0][SigningInfo_signTime],
                0,
                "signature signTime was not set");
        });

        it("should have certificationState set to CertificationPending on document not signed by all required signatories", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1], accounts[2]]);

            await ethNOS.signDocument(
                sampleDocument,
                { from: accounts[1] });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.CertificationPending,
                "certificationState was not set to CertificationPending");
        });

        it("should emit DocumentCertified, should set certificationTime and certificationState to Certified on document signed by all required signatories", async () => {
            const sampleDocument = getRandomDocument();

            await ethNOS.submitDocument(
                sampleDocument,
                [accounts[1], accounts[2]]);

            await ethNOS.signDocument(
                sampleDocument,
                { from: accounts[1] });

            const signResult = await ethNOS.signDocument(
                sampleDocument,
                { from: accounts[2] });

            eventEmitted(
                signResult,
                "DocumentCertified",
                { documentHash: sampleDocument });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            const lastSignature = verifyResult.signatures[verifyResult.signatures.length - 1];

            assert.equal(
                verifyResult.currentCertification[CertificationInfo_certificationTime],
                lastSignature[SigningInfo_signTime],
                "currentCertification.certificationTime was not set properly");

            assert.equal(
                verifyResult.certificationState,
                EthNOS.CertificationState.Certified,
                "certificationState was not set to Certified");
        });
    });

    if (useGSN){

        //--

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
