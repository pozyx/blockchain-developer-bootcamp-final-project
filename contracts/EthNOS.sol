// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@opengsn/contracts/src/BaseRelayRecipient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EthNOSPaymaster.sol";

/**
 * @title Ethereum Notary Service
 * @author Martin Pozor
 * @dev Derives BaseRelayRecipient to allow GSN meta-transactions - see https://docs.opengsn.org/javascript-client/tutorial.html
 */
contract EthNOS is BaseRelayRecipient, Ownable
{
	// TODO:
	// - finish simple GSN tutorial & test (non UI) - incl. fundSigning, withdrawSigningFunds, relayed signDocumentPendingCertification, chargeSignDocumentIfFundedCall
	// - implement & test 5 core functions
	// - implement & test 4 GSN functions + paymaster
	// - design UI
	// - implement barebone UI (core)
	// - implement barebone UI (GSN)
	// - amend and document design pattern decisions
	// - amend and document attack vectors protections
	// - beautify UI
	// - verify and publish source code on etherscan
	// - hosting
	// - instructions: installing, running, tests
	// - screencast

	// TODO: notes
	// - bytes32 testing - '0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53'
	// - do not call onlyowner methods from forwarder (do not set forwarder to accounts[0])

	// TODO: variables

	// TODO: ok version? or 2.2.0?
	/// @inheritdoc IRelayRecipient
	string public override versionRecipient = "2.4.0";

	/// Paymaster contract which manages paying for transactions using GSN.
	EthNOSPaymaster private ethNOSPaymaster;

	/// Certification state of document.
	enum CertificationState
	{
		/// Document was not submitted for certification.
		NotSubmitted,
		/// Document is pending certification. Some required signatories did not sign the document yet.
		CertificationPending,
		/// Document is certified. All required signatories (if applicable) did sign the document.
		Certified
	}

	/// Represents required or completed act of signing the document.
	struct SigningInfo
	{
		/// Address of signatory.
		address signatory;
		/**
		 * Time of signing. Zero if not signed.
		 * @dev seconds since unix epoch
		 */
		uint signTime;
	}

	/// Represents pending or completed act of certification of the document.
	struct CertificationInfo
	{
		/// Required signatures - signatories with times of signing the document (if signed).
		SigningInfo[] signatures;
		/**
		 * Time of document submission / amendment.
		 * @dev seconds since unix epoch
		 */
		uint submissionTime;
		/**
		 * Time of document certification (time when document is signed by all required
		 * signatories). Zero if certification is pending.
		 * @dev seconds since unix epoch
		 */
		uint certificationTime;
	}

	/**
	 * Sets trusted forwarder for transactions using GSN.
	 *
	 * @param _trustedForwarder Trusted forwarder for transactions using GSN.
	 */
	function setTrustedForwarder(address _trustedForwarder)
		external
		onlyOwner
	{
		_setTrustedForwarder(_trustedForwarder);
	}

	/**
	 * Sets paymaster contract which manages paying for transactions using GSN.
	 *
	 * @param _ethNOSPaymaster Paymaster contract which manages paying for transactions using GSN.
	 */
	function setEthNOSPaymaster(EthNOSPaymaster _ethNOSPaymaster)
		external
		onlyOwner
	{
		ethNOSPaymaster = _ethNOSPaymaster;
	}

	/**
	 * Submits document for certification.
	 *
	 * Note that document can be certified as a result of calling this function. This can happen
	 * if no signatories are required or if the document was already signed by all required
	 * signatories (see signDocument).
	 *
	 * Can receive ether - if not zero, then paymaster will be funded to allow ether-less signing (see fundSigning).
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Previously submitted documents are not allowed.)
	 * @param requiredSignatories Addresses of required signatories (can be empty if only proof of existence is required).
	 */
	function submitDocument(
		bytes32 documentHash,
		address[] calldata requiredSignatories)
		external
		payable
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests

		// TODO: if conditions are met
		fundSigning(documentHash);
	}

	/**
	 * Amends submission of previously submitted document -
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
	 * Can receive ether - if not zero, then paymaster will be funded to allow ether-less signing (see fundSigning).
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
	 * @param requiredSignatories Addresses of required signatories (can be empty if only proof of existence is required).
	 */
	function amendDocumentSubmission(
		bytes32 documentHash,
		address[] calldata requiredSignatories)
		external
		payable
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests

		// TODO: if conditions are met
		fundSigning(documentHash);
	}

	/**
	 * Deletes submission of previously submitted document (correcting mistake, etc.).
	 *
	 * Only allowed to be called by document submitter.
	 * Document must be pending to be certified (note that also previously certified
	 * document can be pending for certification again due to submission amendment).
	 *
	 * If the document was already signed, the records will be retained;
	 * also if the document was already certified (signed by all signatories),
	 * the certification will be retained - these acts are irrevokable.
	 * Instead, the document will be not pending for signing any more.
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
	 */
	function deleteDocumentSubmission(
		bytes32 documentHash)
		external
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests
	}

	// TODO: can required amount be calculated?
	/**
	 * Funds paymaster (relay hub) with ether to allow ether-less signing by required signatories using GSN.
	 * Amount will be usable only for signing the specified document.
	 *
	 * Only allowed to be called by document submitter.
	 * Document must be pending to be certified.
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
	 */
	function fundSigning(
		bytes32 documentHash)
		public
		payable
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests

		// sends ether to paymaster (it will be forwarded to relay hub)
		payable(ethNOSPaymaster).transfer(msg.value); // TODO: is transfer ok or really not recommended?
	}

	/**
	 * Withdraws ether previously funded for ether-less signing (using fundSigning) from paymaster (relay hub).
	 * This is usually called after document is certified to get unspent amount back to submitter,
	 * but it is not a requirement.
	 *
	 * Only allowed to be called by document submitter.
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
	 */
	function withdrawSigningFunds(
		bytes32 documentHash)
		external
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests

		// TODO:
		uint amount = 10;

		// TODO: can be done this way?
		ethNOSPaymaster.withdrawRelayHubDeposit(amount);
		payable(_msgSender()).transfer(amount); // TODO: is transfer ok or really not recommended?
	}

	/**
	 * Signs document by sender's account.
	 *
	 * If the document was previously submitted for certification, its certification
	 * state will be re-evaluated - if the signatory is last of the required signatories,
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
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests
	}

	/**
	 * Signs document by sender's account if the document was previously funded for ether-less signing (using fundSigning).
	 *
	 * Not for direct use (only through GSN relayer).
	 *
	 * Document must be pending to be certified.
	 * Sender must be one of the required signatories who did not sign the document yet.
	 *
	 * Document's certification state will be re-evaluated -
	 * if the signatory is last of the required signatories, document will be certified.
	 *
	 * Act of document signing (and possible consequent act of certification) is irrevokable.
	 *
	 * Only this method can be called by GSN relayer.
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
	 */
	function signDocumentIfFunded(
		bytes32 documentHash)
		external
	{
		// TODO: check funding

		// TODO: implement
		// TODO: emit events
		// TODO: unit tests

		// TODO: call signDocument?
	}

	/**
	 * Charges ether used for ether-less document signing.
	 *
	 * Not for direct use (only through GSN relayer).
	 *
	 * After GSN relayer calls signDocumentIfFunded, it will call this method (through paymaster)
	 * and will let this contract know the amount which was charged for the call.
	 * This is in order to trigger required accounting (ether used will be substracted from
	 * the previously funded amount usable for signing the specified document).
	 *
	 * Only allowed to be called by paymaster.
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
	 * @param amountCharged Amount charged by GSN relayer.
	 */
	function chargeSignDocumentIfFundedCall(
		bytes32 documentHash,
		uint256 amountCharged)
		external
	{
		// TODO: implement
		// TODO: emit events
		// TODO: unit tests
	}

	/**
	 * Returns certification state of given document along with
	 * comprehensive information about pending or completed certification(s).
	 *
	 * @param documentHash Keccak256 hash of the document (computed off-chain).
	 *
	 * @return certificationState Certification state.
	 * @return submitter Submitter of the certification. Zero if certificationState = NotSubmitted.
	 * @return currentCertification Current pending or completed certification information.
	 * @return pastCertifications Historical completed certifications (if submission was amended).
	 * @return orphanedSignatures Signatures not required by certification.
	 */
	function verifyDocument(
		bytes32 documentHash)
		external view
		// TODO: memory of return variables is ok?
		returns (
			CertificationState certificationState,
			address submitter,
			CertificationInfo memory currentCertification,
			CertificationInfo[] memory pastCertifications,
			SigningInfo[] memory orphanedSignatures)
	{
		// TODO: implement
		// TODO: emit events?
		// TODO: unit tests

		// TODO: temporary
		SigningInfo[] memory signatures = new SigningInfo[](2);
		signatures[0] = SigningInfo(
		{
			signatory: _msgSender(),
			signTime: block.timestamp
		});
		signatures[1] = SigningInfo(
		{
			signatory: _msgSender(),
			signTime: block.timestamp
		});

		return(
			CertificationState.Certified,
			_msgSender(),
			CertificationInfo(
			{
				signatures: signatures,
				submissionTime: block.timestamp,
				certificationTime: 0
			}),
			new CertificationInfo[](0),
			new SigningInfo[](0));
	}

	// @dev This is to fix multiple inheritance conflict.
	function _msgSender()
		internal view
		override(Context, BaseRelayRecipient)
		returns (address sender)
	{
		sender = BaseRelayRecipient._msgSender();
	}

	// @dev This is to fix multiple inheritance conflict.
	function _msgData()
		internal view
		override(Context, BaseRelayRecipient)
		returns (bytes calldata)
	{
		return BaseRelayRecipient._msgData();
	}
}