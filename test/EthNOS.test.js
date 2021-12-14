const ethers = require("ethers");
const { RelayProvider } = require("@opengsn/provider/dist");
const EthNOS = artifacts.require("EthNOS.sol");
const EthNOSPaymaster = artifacts.require("EthNOSPaymaster.sol");
const BN = web3.utils.BN;
const { catchRevert, catchPaymasterReject } = require("./exceptionsHelpers.js");
const { advanceTimeAndBlock } = require("./advanceTimeHelpers.js");
const { eventEmitted, eventEmittedEx } = require("./testHelpers.js");

contract("EthNOS", async accounts => {

    const useGSN = process.env.NETWORK == "test_with_gsn";

    const emptyDocument = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const defaultSender = accounts[0];

    const CertificationInfo_submissionTime = 0;
    const CertificationInfo_requiredSignatories = 1;
    const CertificationInfo_certificationTime = 2;
    const SigningInfo_signatory = 0;
    const SigningInfo_signTime = 1;

    let ethNOS;
    let ethNOSPaymaster;
    let providerForGSNCalls;
    let etherlessSender;
    let ethNOSForGSNCalls;
    let ethNOSPaymasterForGSNCalls;

    before(async () => {
        ethNOS = await EthNOS.deployed();

        if (useGSN) {
            ethNOSPaymaster = await EthNOSPaymaster.deployed();

            providerForGSNCalls = new ethers.providers.Web3Provider(
                await RelayProvider.newProvider(
                    {
                        provider: web3.currentProvider,
                        config: { paymasterAddress: ethNOSPaymaster.address }
                    })
                    .init());

            const accountForGSNCalls = providerForGSNCalls.provider.newAccount();
            etherlessSender = accountForGSNCalls.address;

            ethNOSForGSNCalls = await new ethers.Contract(
                ethNOS.address,
                ethNOS.abi,
                providerForGSNCalls.getSigner(
                    accountForGSNCalls.address,
                    accountForGSNCalls.privateKey));

            ethNOSPaymasterForGSNCalls = await new ethers.Contract(
                ethNOSPaymaster.address,
                ethNOSPaymaster.abi);
        }
    });

    function getRandomDocument() {
        return web3.utils.randomHex(32);
    }

    async function callViaGSN(functionToCall) {
        return await providerForGSNCalls.waitForTransaction(
            (await functionToCall)
                .hash);
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
                defaultSender,
                "submitter was not set to sender");

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
                { documentHash: sampleDocument }, { signatory: accounts[1] });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.signatures.length,
                1,
                "signatures do not contain one signature");

            assert.equal(
                verifyResult.signatures[0][SigningInfo_signatory],
                accounts[1],
                "signature signatory was not set to sender");

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
                { documentHash: sampleDocument }, { signatory: accounts[1] });

            const verifyResult = await ethNOS.verifyDocument(sampleDocument);

            assert.equal(
                verifyResult.signatures.length,
                1,
                "signatures do not contain one signature");

            assert.equal(
                verifyResult.signatures[0][SigningInfo_signatory],
                accounts[1],
                "signature signatory was not set to sender");

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

    if (useGSN) {

        describe("getDocumentSigningBalance", () => {

            it("should revert on invalid document", async () => {
                await catchRevert(
                    ethNOS.getDocumentSigningBalance(
                        emptyDocument));
            });

            it("should revert on document submitted by someone else", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[2]],
                    { from: accounts[1] });

                await catchRevert(
                    ethNOS.getDocumentSigningBalance(
                        sampleDocument));
            });
        });

        describe("fundDocumentSigning", () => {

            it("should revert on invalid document", async () => {
                await catchRevert(
                    ethNOS.fundDocumentSigning(
                        emptyDocument,
                        { value: web3.utils.toWei("1") }));
            });

            it("should revert on not yet submitted document", async () => {
                const sampleDocument = getRandomDocument();

                await catchRevert(
                    ethNOS.fundDocumentSigning(
                        sampleDocument,
                        { value: web3.utils.toWei("1") }));
            });

            it("should revert on document submitted by someone else", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[2]],
                    { from: accounts[1] });

                await catchRevert(
                    ethNOS.fundDocumentSigning(
                        sampleDocument,
                        { value: web3.utils.toWei("1") }));
            });

            it("should revert on document not pending certification", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[1]]);

                await ethNOS.signDocument(
                    sampleDocument,
                    { from: accounts[1] });

                await catchRevert(
                    ethNOS.fundDocumentSigning(
                        sampleDocument,
                        { value: web3.utils.toWei("1") }));
            });

            it("should revert on sending zero ether", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[1]]);

                await catchRevert(
                    ethNOS.fundDocumentSigning(
                        sampleDocument,
                        { value: 0 }));
            });

            it("should emit DocumentSigningFunded, should increase document signing balance (both in EthNOS and in relay hub contract)", async () => {
                const sampleDocument = getRandomDocument();
                const initialFundingAmount = web3.utils.toWei("2");
                const newFundingAmount = web3.utils.toWei("1");

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[1]],
                    { value: initialFundingAmount });

                const initialSigningBalance = await ethNOS.getDocumentSigningBalance(sampleDocument);

                const initialRelayHubBalance = new BN(
                    await web3.eth.getBalance(
                        await ethNOSPaymaster.getHubAddr()));

                const fundResult = await ethNOS.fundDocumentSigning(
                    sampleDocument,
                    { value: newFundingAmount });

                eventEmitted(
                    fundResult,
                    "DocumentSigningFunded",
                    { documentHash: sampleDocument }, { amount: newFundingAmount });

                const newSigningBalance = await ethNOS.getDocumentSigningBalance(sampleDocument);

                const newRelayHubBalance = new BN(
                    await web3.eth.getBalance(
                        await ethNOSPaymaster.getHubAddr()));

                assert.equal(
                    newSigningBalance.sub(initialSigningBalance),
                    newFundingAmount,
                    "signing balance was not set properly");

                assert.equal(
                    newRelayHubBalance.sub(initialRelayHubBalance),
                    newFundingAmount,
                    "relay hub balance was not set properly");
            });
        });

        describe("submitDocument (with funding)", () => {

            it("should revert on immediately certified document", async () => {
                const sampleDocument = getRandomDocument();

                await catchRevert(
                    ethNOS.submitDocument(
                        sampleDocument,
                        [],
                        { value: web3.utils.toWei("1"), gas: 6721975 })); // TODO: why this needs more gas, and how much?
            });

            it("should emit DocumentSigningFunded, should increase document signing balance (both in EthNOS and in relay hub contract)", async () => {
                const sampleDocument = getRandomDocument();
                const fundingAmount = web3.utils.toWei("1");

                const initialRelayHubBalance = new BN(
                    await web3.eth.getBalance(
                        await ethNOSPaymaster.getHubAddr()));

                const submitResult = await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[1]],
                    { value: fundingAmount });

                eventEmitted(
                    submitResult,
                    "DocumentSigningFunded",
                    { documentHash: sampleDocument }, { amount: fundingAmount });

                const signingBalance = await ethNOS.getDocumentSigningBalance(sampleDocument);

                const relayHubBalance = new BN(
                    await web3.eth.getBalance(
                        await ethNOSPaymaster.getHubAddr()));

                assert.equal(
                    signingBalance,
                    fundingAmount,
                    "signing balance was not set properly");

                assert.equal(
                    relayHubBalance.sub(initialRelayHubBalance),
                    fundingAmount,
                    "relay hub balance was not set properly");
            });
        });

        describe("withdrawDocumentSigningBalance", () => {

            it("should revert on invalid document", async () => {
                await catchRevert(
                    ethNOS.withdrawDocumentSigningBalance(emptyDocument));
            });

            it("should revert on not yet submitted document", async () => {
                const sampleDocument = getRandomDocument();

                await catchRevert(
                    ethNOS.withdrawDocumentSigningBalance(sampleDocument));
            });

            it("should revert on document submitted by someone else", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[2]],
                    { from: accounts[1] });

                await ethNOS.fundDocumentSigning(
                    sampleDocument,
                    { from: accounts[1], value: web3.utils.toWei("1") });

                await catchRevert(
                    ethNOS.withdrawDocumentSigningBalance(sampleDocument));
            });

            it("should revert on document with zero signing balance", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[2]]);

                await catchRevert(
                    ethNOS.withdrawDocumentSigningBalance(sampleDocument));
            });

            it("should emit DocumentSigningBalanceWithdrawn, should decrease document signing balance (both in EthNOS and in relay hub contract), should receive the balance", async () => {
                const sampleDocument = getRandomDocument();
                const fundingAmount = web3.utils.toWei("1");

                await ethNOS.submitDocument(
                    sampleDocument,
                    [accounts[1]],
                    { value: fundingAmount });

                const initialRelayHubBalance = new BN(
                    await web3.eth.getBalance(
                        await ethNOSPaymaster.getHubAddr()));

                const initialSenderBalance = new BN(await web3.eth.getBalance(defaultSender));

                const withdrawResult = await ethNOS.withdrawDocumentSigningBalance(sampleDocument);

                eventEmitted(
                    withdrawResult,
                    "DocumentSigningBalanceWithdrawn",
                    { documentHash: sampleDocument }, { amount: fundingAmount });

                const newSigningBalance = await ethNOS.getDocumentSigningBalance(sampleDocument);

                const newRelayHubBalance = new BN(
                    await web3.eth.getBalance(
                        await ethNOSPaymaster.getHubAddr()));

                const newSenderBalance = new BN(await web3.eth.getBalance(defaultSender));

                assert.equal(
                    newSigningBalance,
                    0,
                    "signing balance was not decreased properly");

                assert.equal(
                    initialRelayHubBalance.sub(newRelayHubBalance),
                    fundingAmount,
                    "relay hub balance was not decreased properly");

                // not exact comparison because of transaction cost
                assert.equal(
                    new BN(fundingAmount).sub(
                        newSenderBalance.sub(initialSenderBalance))
                        .cmp(new BN(web3.utils.toWei("0.01"))),
                    -1,
                    "signing balance was not withdrawn to sender properly");
            });
        });

        describe("signDocument (through GSN)", () => {

            it("should be rejected by paymaster on calling function other than signDocument", async () => {
                const sampleDocument = getRandomDocument();

                await catchPaymasterReject(
                    callViaGSN(
                        ethNOSForGSNCalls.submitDocument(
                            sampleDocument,
                            [])));
            });

            it("should be rejected by paymaster on document not pending certification", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [defaultSender],
                    { value: web3.utils.toWei("2") });

                await ethNOS.signDocument(
                    sampleDocument,
                    { from: defaultSender });

                await catchPaymasterReject(
                    callViaGSN(
                        ethNOSForGSNCalls.signDocument(sampleDocument)));
            });

            it("should be rejected by paymaster on document not having sender among required signatories", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [defaultSender],
                    { value: web3.utils.toWei("2") });

                await catchPaymasterReject(
                    callViaGSN(
                        ethNOSForGSNCalls.signDocument(sampleDocument)));
            });

            it("should revert on document with insufficient signing balance", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [etherlessSender],
                    { value: web3.utils.toWei("0") });

                await catchPaymasterReject(
                    callViaGSN(
                        ethNOSForGSNCalls.signDocument(sampleDocument)));
            });

            it("should emit DocumentSigned, DocumentSigningCharged, paymaster should emit PreRelayed and PostRelayed, should add signatory (with signTime), should decrease document signing balance, should not spend any ether", async () => {
                const sampleDocument = getRandomDocument();

                await ethNOS.submitDocument(
                    sampleDocument,
                    [etherlessSender],
                    { value: web3.utils.toWei("2") });

                const initialSigningBalance = await ethNOS.getDocumentSigningBalance(sampleDocument);
                const initialSenderBalance = new BN(await web3.eth.getBalance(etherlessSender));

                const signReceipt = await callViaGSN(
                    ethNOSForGSNCalls.signDocument(sampleDocument));

                const newSigningBalance = await ethNOS.getDocumentSigningBalance(sampleDocument);
                const newSenderBalance = new BN(await web3.eth.getBalance(etherlessSender));

                eventEmittedEx(
                    signReceipt,
                    "DocumentSigned",
                    ethNOSForGSNCalls.interface,
                    { documentHash: sampleDocument }, { signatory: etherlessSender });

                eventEmittedEx(
                    signReceipt,
                    "DocumentSigningCharged",
                    ethNOSForGSNCalls.interface,
                    { documentHash: sampleDocument });

                eventEmittedEx(
                    signReceipt,
                    "PreRelayed",
                    ethNOSPaymasterForGSNCalls.interface,
                    { documentHash: sampleDocument });

                eventEmittedEx(
                    signReceipt,
                    "PostRelayed",
                    ethNOSPaymasterForGSNCalls.interface,
                    { documentHash: sampleDocument });

                const verifyResult = await ethNOS.verifyDocument(sampleDocument);

                assert.equal(
                    verifyResult.signatures.length,
                    1,
                    "signatures do not contain one signature");

                assert.equal(
                    verifyResult.signatures[0][SigningInfo_signatory],
                    etherlessSender,
                    "signature signatory was not set to sender");

                assert.notEqual(
                    verifyResult.signatures[0][SigningInfo_signTime],
                    0,
                    "signature signTime was not set");

                assert.equal(
                    newSigningBalance.cmp(initialSigningBalance),
                    -1,
                    "signing balance was not decreased properly");

                assert.equal(
                    initialSenderBalance.cmp(newSenderBalance),
                    0,
                    "sender's balance was decreased unexpectedly (ether should not have been spent)");
            });
        });
    }
});
