// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@opengsn/contracts/src/BasePaymaster.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./EthNOS.sol";

/**
 * @title GSN Paymaster for Ethereum Notary Service
 * @author Martin Pozor
 * @dev see https://docs.opengsn.org/javascript-client/tutorial.html
 */
contract EthNOSPaymaster is BasePaymaster
{
	using SafeMath for uint256;

	/// EthNOS contract paymaster will pay for.
	EthNOS private ethNOS;

	/// Gas used by postRelayedCall, for proper gas calculation.
	uint public gasUsedByPost;

	/// @inheritdoc IPaymaster
	string public override versionPaymaster = "2.2.4";

	// TODO: other params?
	/// Event emited before transaction is relayed.
	event PreRelayed(bytes32 documentHash);

	// TODO: other params?
	/// Event emited after transaction is relayed.
	event PostRelayed(bytes32 documentHash);

	/**
	 * Sets EthNOS contract paymaster will pay for.
	 *
	 * @param _ethNOS EthNOS contract.
	 */
	function setEthNOS(EthNOS _ethNOS)
		external
		onlyOwner
	{
		ethNOS = _ethNOS;
	}

	/// Sets gas used by postRelayedCall, for proper gas calculation.
	function setPostGasUsage(uint _gasUsedByPost)
		external
		onlyOwner
	{
		gasUsedByPost = _gasUsedByPost;
	}

	// TODO: override getGasAndDataLimits? probably not

	/// @inheritdoc IPaymaster
	function preRelayedCall(
		GsnTypes.RelayRequest calldata relayRequest,
		bytes calldata signature,
		bytes calldata approvalData,
		uint256 maxPossibleGas) // TODO: understand
		external
		override
		virtual
		relayHubOnly
		returns (bytes memory context, bool)
	{
		_verifyForwarder(relayRequest);
		require(relayRequest.request.to == address(ethNOS));

		// TODO: only allow signDocumentPendingCertification call

		(signature, approvalData, maxPossibleGas);

		// TODO: parse documentHash
		bytes32 documentHash = 0xbec921276c8067fe0c82def3e5ecfd8447f1961bc85768c2a56e6bd26d3c0c53;

		emit PreRelayed(documentHash);

		return
			(abi.encode(documentHash),
			// Funding conditions will be evaluated by target contract.
			// If call cannot be paid for, it will be reverted.
			true);
	}

	/// @inheritdoc IPaymaster
	function postRelayedCall(
		bytes calldata context,
		bool success,
		uint256 gasUseWithoutPost,
		GsnTypes.RelayData calldata relayData)
		external
		override
		virtual
		relayHubOnly
	{
		// TODO: really don't use success?
		(success);

		bytes32 documentHash = abi.decode(context, (bytes32));

		uint256 amountCharged = relayHub.calculateCharge(
			gasUseWithoutPost.add(gasUsedByPost),
			relayData);

		ethNOS.chargeSignDocumentIfFundedCall(documentHash, amountCharged);

		emit PostRelayed(documentHash);
	}

	/**
	 * Withdraws ether from relay hub deposit.
	 *
	 * (Only allowed to be called by EthNOS contract.)
	 *
	 * @param amount Required amount to withdraw.
	 * @param dest Address to withdraw to.
	 */
	function withdrawRelayHubDeposit(
		uint amount,
		address payable dest)
		external
	{
		require(_msgSender() == address(ethNOS), "Only EthNOS contract is allowed to withdraw");
        relayHub.withdraw(amount, dest);
    }
}