// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract EthNOS 
{
  // TODO:
  // - To avoid requiring signatories to spend ETH, they will be able to perform the signing as "etherless" transaction. In the above example (see Example workflow) it is not reasonable to expect that signatory (the person taking the mortgage) would be willing to pay just for signing the mortgage agreement, rather than that submitter (the mortgage broker) will bear the cost of this. This will be done using meta-transactions (OpenGSN or similar).
  // - Ability to amend existing submission of a document (such as adding / removing required signatories) by the submitter will be considered.
  // - Possibility of submission with signing in one transaction (for cases when submitter is also a signatory) will be considered.
  // - Ability to run arbitrary transaction (smart contract call, etc.) on document verification.
  // - decouple submission / signing?
  // - current time oracle?

  // TODO: variables  
  // TODO: enums
  // TODO: structs
  // TODO: events
  // TODO: modifiers
  // TODO: constructors

  // Submits document for signing.
  function submitDocument(
    // Keccak256 hash of the document (computed off-chain).
    bytes32 documentHash,    
    // Addresses of required signatories (can be empty if only proof of existence is required).
    address[] calldata requiredSignatories)
    external
    // TODO: ok not returning?
    {
      // TODO: implement
      // TODO: emit events
      // TODO: unit tests
    }  

  // Signs document by the caller account.
  function signDocument(
    // Keccak256 hash of the document (computed off-chain).
    bytes32 documentHash)
    external
    // TODO: ok not returning?
  {
      // TODO: implement
      // TODO: emit events
      // TODO: unit tests
  }

  // Checks if document has been verified (signed by all required signatories).
  function verifyDocument(
    // Keccak256 hash of the document (computed off-chain).
    bytes32 documentHash)
    external view
    returns(bool) 
    // TODO: change? more information? or separate methods?  
    // - state (unknown, pending, valid)
    // - submitter, submit time
    // - signatories - signatory, sign time
    // - validation time
  {
      // TODO: implement
      return true;    
      // TODO: emit events?
      // TODO: unit tests      
  }
}