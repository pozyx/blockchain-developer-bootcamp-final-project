// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@opengsn/contracts/src/BasePaymaster.sol";
import "./EthNOS.sol";

/**
 * @title GSN Paymaster for Ethereum Notary Service
 * @author Martin Pozor
 * @dev see https://docs.opengsn.org/javascript-client/tutorial.html
 */
contract EthNOSPaymaster is BasePaymaster
{
	/// EthNOS contract paymaster will pay for.
	EthNOS private ethNOS;

	/// Gas used by postRelayedCall, for proper gas calculation.
	uint public gasUsedByPost;

	/// @inheritdoc IPaymaster
	string public override versionPaymaster = "2.2.4";

	/// Event emited before transaction is relayed.
	event PreRelayed(bytes32 documentHash);

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

	/**
	 * Only calls to EthNOS contract of function signDocument are allowed to be relayed.
	 * EthNOS contract is queried for funding approval
     *
	 * @inheritdoc IPaymaster
	 */
	function preRelayedCall(
		GsnTypes.RelayRequest calldata relayRequest,
		bytes calldata signature,
		bytes calldata approvalData,
		uint maxPossibleGas)
		external
		override
		virtual
		relayHubOnly
		returns (bytes memory context, bool)
	{
		(signature, approvalData);

		_verifyForwarder(relayRequest);
		require(relayRequest.request.to == address(ethNOS));
		require(bytes4(relayRequest.request.data[:4]) == EthNOS.signDocument.selector, "Only signDocument call is allowed");

		bytes32 documentHash = abi.decode(relayRequest.request.data[4:], (bytes32));

		uint maxAmountToBeCharged = relayHub.calculateCharge(
			maxPossibleGas,
			relayRequest.relayData);

		// reverts if not funded
		ethNOS.approveRelayedSignDocumentCall(
			documentHash,
			maxAmountToBeCharged,
			relayRequest.request.from);

		emit PreRelayed(documentHash);

		return (abi.encode(documentHash), false);
	}

	/**
	 * EthNOS contract is called to do accounting after charge.
     *
	 * @inheritdoc IPaymaster
	 */
	function postRelayedCall(
		bytes calldata context,
		bool success,
		uint gasUseWithoutPost,
		GsnTypes.RelayData calldata relayData)
		external
		override
		virtual
		relayHubOnly
	{
		(success);

		bytes32 documentHash = abi.decode(context, (bytes32));

		uint amountCharged = relayHub.calculateCharge(
			gasUseWithoutPost + gasUsedByPost,
			relayData);

		ethNOS.chargeRelayedSignDocumentCall(documentHash, amountCharged);

		emit PostRelayed(documentHash);
	}

	/**
	 * Withdraws ether from relay hub deposit.
	 *
	 * Only allowed to be called by EthNOS contract.
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