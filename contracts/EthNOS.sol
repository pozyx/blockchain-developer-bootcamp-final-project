// SPDX-License-Identifier: MIT

pragma solidity 0.8.11;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EthNOSPaymaster.sol";

/**
 * @title Ethereum Notary Service
 * @author Martin Pozor
 * @dev Derives BaseRelayRecipient to allow GSN meta-transactions - see https://docs.opengsn.org/javascript-client/tutorial.html
 */
contract EthNOS is BaseRelayRecipient, Ownable {
    // TODO:
    // - UI: fund/withdraw for etherless sign
    // - UI: etherless sign
    //   - (see OpenGSN/SimpleUse, OpenGSN React app)
    // - UI: busy indicator for state change operations
    // - UI: verify document for state change operations
    // - (UI: resolve ENS addresses)
    // - (calculate and set post gas usage)
    // - (can required amount for etherless signing be calculated?)
    // - try clean run
    //    - tests
    //    - web
    //    - (also Windows)
    // - deploy
    //   - smart contracts (Rinkeby)
    //     - deployed address.txt
    //   - (verify and publish source code on etherscan)
    //   - web (hosting)
    // - prepare for submission
    //   - amend and document design pattern decisions (at least 2, at last 1 lib or iface)
    //     - open gsn derived
    //     - access control
    //     - inter contract execution???
    //   - amend and document attack vectors protections (at least 2)
    //     - specific compiler pragma
    //     - require, assert, revert
    //     - modifiers
    //     - pull over push
    //   - amend/prepare README.md (use example project as template)
    //     - add address
    //   - known issues:
    //     - event sometimes does not come (Rinkeby)
    //   - possible improvements:
    //     - fund on submit, amend/delete, show history, show orphaned signatories
    //   - cleanup or move TODOs and notes
    //   - (certification state chart)
    //   - screencast

    // TODO: notes
    // - use yarn (opengsn was not buildable in npm)
    // - GSN worked on Rinkeby, not Ropsten
    // - manual run:
    //   - run Ganache: net=`date "+%j%H%M%S"` && ganache-cli --networkId $net --chainId $net -v
    //   - run GSN: gsn start
    //   - run Truffle: truffle console
    // - clean run:
    //   - install nvm
    //   - install node (npm)
    //   - npm install -g yarn
    //   - npm install -g truffle
    //   - npm install -g @angular/cli
    // - manual wallet funding:
    //   - web3.eth.sendTransaction({ from: accounts[0], to: "0xBa36436982A4EEBDC5e322E4a492DE7fE064b918", value: web3.utils.toWei("1") })
    // - issue in Chrome: if navigated too quickly after browser start, it will not be able to connect to MetaMask until refresh
    // - manual submit
    //   - yarn start
    //   - ethNOS = await EthNOS.deployed();
    //   - not submitted:
    //     http://localhost:4200/document/0x7770cebd8da24269f3972c7d2cc4602d24695a4cfda1a5592e2495bbce1ba0fc
    //   - pending:
    //     http://localhost:4200/document/0x4ac60fd001ee7fec40ab71fc404b847103732452179375294d0e0e23b8be0457
    //     ethNOS.submitDocument('0x4ac60fd001ee7fec40ab71fc404b847103732452179375294d0e0e23b8be0457',[accounts[1], accounts[2], accounts[3], accounts[4]]);
    //     ethNOS.signDocument('0x4ac60fd001ee7fec40ab71fc404b847103732452179375294d0e0e23b8be0457', { from: accounts[1] });
    //     ethNOS.signDocument('0x4ac60fd001ee7fec40ab71fc404b847103732452179375294d0e0e23b8be0457', { from: accounts[2] });
    //   - certified
    //     http://localhost:4200/document/0x2e936c99cba86a645b7bcb4fb194f9c67ff92021bb533bfdb3329719e7d282a9
    //     ethNOS.submitDocument('0x2e936c99cba86a645b7bcb4fb194f9c67ff92021bb533bfdb3329719e7d282a9',[accounts[1], accounts[2], accounts[3], accounts[4]]);
    //     ethNOS.signDocument('0x2e936c99cba86a645b7bcb4fb194f9c67ff92021bb533bfdb3329719e7d282a9', { from: accounts[1] });
    //     ethNOS.signDocument('0x2e936c99cba86a645b7bcb4fb194f9c67ff92021bb533bfdb3329719e7d282a9', { from: accounts[2] });
    //     ethNOS.signDocument('0x2e936c99cba86a645b7bcb4fb194f9c67ff92021bb533bfdb3329719e7d282a9', { from: accounts[3] });
    //     ethNOS.signDocument('0x2e936c99cba86a645b7bcb4fb194f9c67ff92021bb533bfdb3329719e7d282a9', { from: accounts[4] });

    /// Certification state of document.
    enum CertificationState {
        /// Document was not submitted for certification.
        NotSubmitted,
        /// Document is pending certification. Some required signatories did not sign the document yet.
        CertificationPending,
        /// Document is certified. All required signatories (if applicable) did sign the document.
        Certified
    }

    /// Represents required or completed act of signing the document.
    struct SigningInfo {
        /// Address of signatory.
        address signatory;
        /// Time of signing. Zero if not signed.
        /// @dev seconds since unix epoch
        uint signTime;
    }

    /// Represents pending or completed act of certification of the document.
    struct CertificationInfo {
        /// Time of document submission / amendment.
        /// @dev seconds since unix epoch
        uint submissionTime;
        /// Signatories required for certification.
        address[] requiredSignatories;
        /// Time of document certification (time when document is signed by all required
        /// signatories). Zero if certification is pending.
        /// @dev seconds since unix epoch
        uint certificationTime;
    }

    /// Represents all signing and certification information for the document.
    struct DocumentInfo {
        // Account which submitted the document for certification. Zero if not submitted yet.
        address submitter;
        // Certification state of the document.
        CertificationState certificationState;
        // Current certification information of the document.
        CertificationInfo currentCertification;
        // Historical certification information of the document (if certification was amended).
        CertificationInfo[] pastCertifications;
        // All signatures of the document.
        SigningInfo[] signatures;
        // All signatures of the document (key is signatory address).
        mapping (address => SigningInfo) signaturesForSignatories;
        // Balance to allow ether-less signing by required signatories using GSN.
        uint signingBalance;
    }

    /// @inheritdoc IRelayRecipient
    string public override versionRecipient = "2.2.4";

    /// Paymaster contract which manages paying for transactions using GSN.
    EthNOSPaymaster public ethNOSPaymaster;

    /// Signing and certification information for all documents (key is keccak256 hash of the document).
    mapping (bytes32 => DocumentInfo) private documents;

    /// Event emited when document is submitted for certification.
    /// @param documentHash Keccak256 hash of the document.
    event DocumentSubmitted(bytes32 indexed documentHash);

    /// Event emited when certification submission of previously submitted document is amended.
    /// @param documentHash Keccak256 hash of the document.
    event DocumentSubmissionAmended(bytes32 indexed documentHash);

    /// Event emited when certification submission of previously submitted document is delete.
    /// @param documentHash Keccak256 hash of the document.
    event DocumentSubmissionDeleted(bytes32 indexed documentHash);

    /// Event emited when paymaster (relay hub) is funded with ether to allow ether-less signing by required signatories using GSN.
    /// @param documentHash Keccak256 hash of the document.
    /// @param amount Amount funded for signing the specified document.
    event DocumentSigningFunded(bytes32 indexed documentHash, uint amount);

    /// Event emited when ether previously funded for ether-less signing is withdrawn from paymaster (relay hub).
    /// @param documentHash Keccak256 hash of the document.
    /// @param amount Amount withdrawn from signing the specified document.
    event DocumentSigningBalanceWithdrawn(bytes32 indexed documentHash, uint amount);

    /// Event emited when document is signed.
    /// @param documentHash Keccak256 hash of the document.
    /// @param signatory Address of the signatory.
    event DocumentSigned(bytes32 indexed documentHash, address signatory);

    /// Event emited when ether-less signing was performed and spent amount is charged
    /// (substracted from balance for signing the specified document).
    /// @param documentHash Keccak256 hash of the document.
    /// @param amount Amount charged for signing the specified document.
    event DocumentSigningCharged(bytes32 indexed documentHash, uint amount);

    /// Event emited when document is certified (all requited signatories signed the document).
    /// @param documentHash Keccak256 hash of the document.
    event DocumentCertified(bytes32 indexed documentHash);

    /// Check paymaster contract is set.
    modifier isEthNOSPaymasterSet() {
        require(address(ethNOSPaymaster) != address(0), "Paymaster contract not set");
        _;
      }

    /**
     * Check document hash is not empty.
     *
     * @param documentHash Keccak256 hash of the document.
     */
    modifier documentValid(bytes32 documentHash) {
        require(documentHash != 0, "Invalid document hash");
        _;
      }

    /**
     * Check sender is document submitter.
     *
     * @param documentHash Keccak256 hash of the document.
     */
    modifier onlySubmitter(bytes32 documentHash) {
        require(_msgSender() == documents[documentHash].submitter, "Sender is not document submitter or document was not submitted");
        _;
    }

    /// Check sender is paymaster.
    modifier onlyPaymaster() {
        require(_msgSender() == address(ethNOSPaymaster), "Sender is not paymaster");
        _;
    }

    /**
     * Check document is pending certification.
     *
     * @param documentHash Keccak256 hash of the document.
     */
    modifier onlyPendingCertification(bytes32 documentHash) {
        require(documents[documentHash].certificationState == CertificationState.CertificationPending, "Document is not pending certification");
        _;
    }

    /**
     * Sets trusted forwarder for transactions using GSN.
     *
     * @param _trustedForwarder Trusted forwarder for transactions using GSN.
     */
    function setTrustedForwarder(address _trustedForwarder)
        external
        onlyOwner {
        _setTrustedForwarder(_trustedForwarder);
    }

    /**
     * Sets paymaster contract which manages paying for transactions using GSN.
     *
     * @param _ethNOSPaymaster Paymaster contract which manages paying for transactions using GSN.
     */
    function setEthNOSPaymaster(EthNOSPaymaster _ethNOSPaymaster)
        external
        onlyOwner {
        ethNOSPaymaster = _ethNOSPaymaster;
    }

    /**
     * Submits document for certification.
     *
     * Note that document can be certified as a result of calling this function. This can happen
     * if no signatories are required or if the document was already signed by all required
     * signatories (see signDocument).
     *
     * Can receive ether - if not zero, then paymaster will be funded to allow ether-less signing (see fundDocumentSigning) -
     * only allowed when document is not immediately certified.
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain). Previously submitted documents are not allowed.
     * @param requiredSignatories Addresses of required signatories (can be empty if only proof of existence is required).
     */
    function submitDocument(
        bytes32 documentHash,
        address[] calldata requiredSignatories)
        external
        payable
        documentValid(documentHash) {
        DocumentInfo storage document = documents[documentHash];

        require(document.submitter == address(0), "Document was already submitted");

        document.submitter = _msgSender();

        emit DocumentSubmitted(documentHash);

        submitDocumentInternal(
            document,
            documentHash,
            requiredSignatories);
    }

    /**
     * Amends certification submission of previously submitted document -
     * allows to amend required signatories (correcting mistake, etc.).
     *
     * Only allowed to be called by document submitter.
     *
     * If the document was already signed, the records will be retained;
     * also if the document was already certified (signed by all signatories),
     * the certification will be retained - these acts are irrevokable.
     * Instead, the document will be allowed to be re-certified with amended signatories.
     *
     * Note that document can be certified as a result of calling this function. This can happen
     * if no signatories are required or if the document was already signed by all required
     * signatories (see signDocument).
     *
     * Can receive ether - if not zero, then paymaster will be funded to allow ether-less signing (see fundDocumentSigning) -
     * only allowed when document is not immediately certified.
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain). Only previously submitted documents are allowed.
     * @param requiredSignatories Addresses of required signatories (can be empty if only proof of existence is required).
     */
    function amendDocumentSubmission(
        bytes32 documentHash,
        address[] calldata requiredSignatories)
        external
        payable
        documentValid(documentHash)
        onlySubmitter(documentHash) {
        DocumentInfo storage document = documents[documentHash];

        if (document.certificationState == CertificationState.Certified)
            document.pastCertifications.push(document.currentCertification);

        delete document.currentCertification;

        emit DocumentSubmissionAmended(documentHash);

        submitDocumentInternal(
            document,
            documentHash,
            requiredSignatories);
    }

    /// See submitDocument and amendDocumentSubmission.
    function submitDocumentInternal(
        DocumentInfo storage document,
        bytes32 documentHash,
        address[] calldata requiredSignatories)
        private {
        document.currentCertification.submissionTime = block.timestamp;
        document.currentCertification.requiredSignatories = requiredSignatories;

        document.certificationState = CertificationState.CertificationPending;
        updateDocumentCertification(documentHash, document);

        if (msg.value > 0)
            fundDocumentSigning(documentHash);
    }

    /**
     * Deletes certification submission of previously submitted document (correcting mistake, etc.).
     *
     * Only allowed to be called by document submitter.
     * Document must be pending to be certified (note that also previously certified
     * document can be pending certification again due to submission amendment).
     *
     * If the document was already signed, the records will be retained;
     * also if the document was already certified (signed by all signatories),
     * the certification will be retained - these acts are irrevokable.
     * Instead, the document will be not pending signing any more.
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain). Only document pending certification is allowed.
     */
    function deleteDocumentSubmission(
        bytes32 documentHash)
        external
        documentValid(documentHash)
        onlySubmitter(documentHash)
        onlyPendingCertification(documentHash) {
        DocumentInfo storage document = documents[documentHash];

        if (document.pastCertifications.length == 0) {
            delete document.currentCertification;
            document.certificationState = CertificationState.NotSubmitted;
        }
        else {
            document.currentCertification = document.pastCertifications[document.pastCertifications.length - 1];
            document.pastCertifications.pop();
            document.certificationState = CertificationState.Certified;
        }

        emit DocumentSubmissionDeleted(documentHash);
    }

    /**
     * Funds paymaster (relay hub) with ether to allow ether-less signing (using fundDocumentSigning) by required signatories using GSN.
     * Amount will be usable only for signing the specified document.
     *
     * Only allowed when EthNOSPaymaster is set (etherless signing is supported).
     * Only allowed to be called by document submitter.
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain). Only document pending certification is allowed.
     */
    function fundDocumentSigning(
        bytes32 documentHash)
        public
        payable
        isEthNOSPaymasterSet
        documentValid(documentHash)
        onlySubmitter(documentHash)
        onlyPendingCertification(documentHash) {
        require(msg.value > 0, "No ether provided");

        DocumentInfo storage document = documents[documentHash];

        document.signingBalance += msg.value;

        // sends ether to paymaster (it will be forwarded to relay hub)
        (bool sent, bytes memory data) = payable(ethNOSPaymaster).call{value: msg.value}("");
        (data);
        require(sent, "Failed to fund paymaster / relay hub");

        emit DocumentSigningFunded(documentHash, msg.value);
    }

    /**
     * Withdraws ether previously funded for ether-less signing (using fundDocumentSigning) from paymaster (relay hub).
     * This is usually called after document is certified to get unspent amount back to submitter,
     * but it is not a requirement.
     *
     * Only allowed when EthNOSPaymaster is set (etherless signing is supported).
     * Only allowed to be called by document submitter.
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain). Only previously submitted documents are allowed.
     */
    function withdrawDocumentSigningBalance(
        bytes32 documentHash)
        external
        isEthNOSPaymasterSet
        documentValid(documentHash)
        onlySubmitter(documentHash) {
        DocumentInfo storage document = documents[documentHash];

        require(document.signingBalance > 0, "No balance to withdraw");

        ethNOSPaymaster.withdrawRelayHubDeposit(document.signingBalance, payable(_msgSender()));

        emit DocumentSigningBalanceWithdrawn(documentHash, document.signingBalance);

        document.signingBalance = 0;
    }

    /**
     * Checks balance of ether previously funded for ether-less signing (using fundDocumentSigning).
     *
     * Only allowed when EthNOSPaymaster is set (etherless signing is supported).
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain). Only previously submitted documents are allowed.
     *
     * @return signingBalance Balance of ether previously funded for ether-less signing.
     */
    function getDocumentSigningBalance(
        bytes32 documentHash)
        external
        view
        isEthNOSPaymasterSet
        documentValid(documentHash)
        returns (uint signingBalance) {
        return documents[documentHash].signingBalance;
    }

    /**
     * Signs document by sender's account.
     *
     * If the document was previously submitted for certification, its certification
     * state will be updated - if the signatory is last of the required signatories,
     * document will be certified.
     *
     * Act of document signing (and possible consequent act of certification) is irrevokable.
     *
     * Note that act of document signing can be done independently of submission
     * for certification (or before it happens).
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain).
     */
    function signDocument(
        bytes32 documentHash)
        external
        documentValid(documentHash) {
        DocumentInfo storage document = documents[documentHash];

        require(document.signaturesForSignatories[_msgSender()].signTime == 0, "Already signed by sender");

        SigningInfo memory newSignature = SigningInfo({
            signatory: _msgSender(),
            signTime: block.timestamp
        });

        document.signaturesForSignatories[_msgSender()] = newSignature;
        document.signatures.push(newSignature);

        emit DocumentSigned(documentHash, _msgSender());

        if (document.certificationState == CertificationState.CertificationPending)
            updateDocumentCertification(documentHash, document);
    }

    /**
     * Checks if ether-less call of signDocument (using GSN) is approved. Revert means not appproved.
     *
     * Not for direct use - only can be called from paymaster (initiated by GSN relayer).
     *
     * Before GSN relayer calls signDocument, it will call this method (through paymaster)
     * and will check all required conditions of funding the relayed call.
     *
     * @param documentHash Keccak256 hash of the document. Only document pending certification is allowed.
     * @param maxAmountToBeCharged Maximum amout which can be charged by GSN relayer. Previously funded balance (using fundDocumentSigning) cannot be lower.
     * @param originalSender Original sender of the intended signDocument call. Must be one of the required document signatories.
     */
    function approveRelayedSignDocumentCall(
        bytes32 documentHash,
        uint maxAmountToBeCharged,
        address originalSender)
        external
        view
        onlyPaymaster
        documentValid(documentHash)
        onlyPendingCertification(documentHash) {
        DocumentInfo storage document = documents[documentHash];

        require(maxAmountToBeCharged <= document.signingBalance, "Insufficient balance - not enough funds for signing the document");

        bool isSenderRequiredSignatory = false;

        for (uint i = 0; i < document.currentCertification.requiredSignatories.length; i++) {
            if (document.currentCertification.requiredSignatories[i] == originalSender) {
                isSenderRequiredSignatory = true;
                break;
            }
        }

        require(isSenderRequiredSignatory, "Sender is not required signatory");
    }

    /**
     * Charges ether used for ether-less document signing.
     *
     * Not for direct use - only can be called from paymaster (initiated by GSN relayer).
     *
     * After GSN relayer calls signDocument, it will call this method (through paymaster)
     * and will let this contract know the amount which was charged for the call.
     * This is in order to trigger required accounting (ether used will be substracted from
     * the previously funded amount usable for signing the specified document).
     *
     * @param documentHash Keccak256 hash of the document.
     * @param amountCharged Amount charged by GSN relayer.
     */
    function chargeRelayedSignDocumentCall(
        bytes32 documentHash,
        uint amountCharged)
        external
        onlyPaymaster {
        // - no need to validate the document - it was previously checked in approveRelayedSignDocumentCall
        // (there is no way to call this function without making approveRelayedSignDocumentCall call first)
        // - no need to validate amountCharged - it was previously checked in approveRelayedSignDocumentCall
        documents[documentHash].signingBalance -= amountCharged;

        emit DocumentSigningCharged(documentHash, amountCharged);
    }

    /**
     * Returns certification state of given document along with
     * comprehensive information about pending or completed certification(s).
     *
     * @param documentHash Keccak256 hash of the document (computed off-chain).
     *
     * @return certificationState Certification state.
     * @return submitter Submitter of the certification. Zero if certificationState = NotSubmitted (and not deleted).
     * @return currentCertification Current pending or completed certification information.
     * @return pastCertifications Historical completed certifications (if submission was amended).
     * @return signatures Signatures (including signatures not required by certification).
     */
    function verifyDocument(
        bytes32 documentHash)
        external
        view
        documentValid(documentHash)
        returns (
            CertificationState certificationState,
            address submitter,
            CertificationInfo memory currentCertification,
            CertificationInfo[] memory pastCertifications,
            SigningInfo[] memory signatures) {
        DocumentInfo storage document = documents[documentHash];

        return(
            document.certificationState,
            document.submitter,
            document.currentCertification,
            document.pastCertifications,
            document.signatures);
    }

    /**
     * Updates certification state of the document.
     * If the document was signed by all required signatories, it is marked as certified.
     *
     * @param documentHash Keccak256 hash of the document.
     * @param document Document data.
     */
    function updateDocumentCertification(
        bytes32 documentHash,
        DocumentInfo storage document)
        private {
        bool shouldBeCertified = true;

        for (uint i = 0; i < document.currentCertification.requiredSignatories.length; i++) {
            address requiredSignatory = document.currentCertification.requiredSignatories[i];

            SigningInfo storage recordedSignature = document.signaturesForSignatories[requiredSignatory];

            if (recordedSignature.signatory == address(0))
                shouldBeCertified = false;
        }

        if (shouldBeCertified) {
            document.certificationState = CertificationState.Certified;
            document.currentCertification.certificationTime = block.timestamp;

            emit DocumentCertified(documentHash);
        }
    }

    // @dev This is to fix multiple inheritance conflict.
    function _msgSender()
        internal view
        override(Context, BaseRelayRecipient)
        returns (address sender) {
        sender = BaseRelayRecipient._msgSender();
    }

    // @dev This is to fix multiple inheritance conflict.
    function _msgData()
        internal view
        override(Context, BaseRelayRecipient)
        returns (bytes calldata) {
        return BaseRelayRecipient._msgData();
    }
}