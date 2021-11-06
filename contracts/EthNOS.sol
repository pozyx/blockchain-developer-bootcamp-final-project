// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/// @title Ethereum Notary Service
/// @author Martin Pozor
contract EthNOS 
{ 
  // TODO: validate NatSpec
  // - @dev?
  // - multiline, with linebreaks?
  // - @return with name?

  // TODO:
  // - To avoid requiring signatories to spend ETH, they will be able to perform the signing as "etherless" transaction. In the above example (see Example workflow) it is not reasonable to expect that signatory (the person taking the mortgage) would be willing to pay just for signing the mortgage agreement, rather than that submitter (the mortgage broker) will bear the cost of this. This will be done using meta-transactions (OpenGSN or similar).
  // - Ability to run arbitrary transaction (smart contract call, etc.) on document verification.
  // - Current time oracle?
  
  // TODO: variables    
    
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
    /// Time of signing. Zero if not signed.
    /// @dev seconds since unix epoch
    uint signTime;
  }  

  /// Represents pending or completed act of certification of the document.
  struct CertificationInfo
  {    
    /// Required signatures - signatories with times of signing the document (if signed).
    SigningInfo[] signatures;    
    /// Time of document submission / amendment.
    /// @dev seconds since unix epoch
    uint submissionTime;    
    /// Time of document certification (time when document is signed by all required
    /// signatories). Zero if certification is pending.
    /// @dev seconds since unix epoch
    uint certificationTime;
  }

  // TODO: events
  // TODO: modifiers
  // TODO: constructor?

  /// Submits document for certification.
  ///
  /// Note that document can be certified as a result of calling this function. This can happen
  /// if no signatories are required or if the document was already signed by all required
  /// signatories (see signDocument).
  /// @param documentHash Keccak256 hash of the document (computed off-chain). (Previously submitted documents are not allowed.)
  /// @param requiredSignatories Addresses of required signatories (can be empty if only proof of existence is required).
  function submitDocument(  
    bytes32 documentHash,  
    address[] calldata requiredSignatories)
    external
  {
    // TODO: implement
    // TODO: emit events
    // TODO: unit tests
  }  
      
  /// Amends submission of previously submitted document -
  /// allows to amend required signatories (correcting mistake, etc.).
  /// (Only allowed to be called by document submitter.)
  //
  /// If the document was already signed, the records will be retained;
  /// also if the document was already certified (signed by all signatories),
  /// the certification will be retained - these acts are irrevokable.
  /// Instead, the document will be allowed to be re-certified with amended signatories.
  ///
  /// Note that document can be certified as a result of calling this function. This can happen
  /// if no signatories are required or if the document was already signed by all required
  /// signatories (see signDocument).
  /// @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
  /// @param requiredSignatories Addresses of required signatories (can be empty if only proof of existence is required).
  function amendDocumentSubmission(
    bytes32 documentHash,
    address[] calldata requiredSignatories)
    external
  {
    // TODO: implement
    // TODO: emit events
    // TODO: unit tests
  }
  
  /// Deletes submission of previously submitted document (correcting mistake, etc.).
  /// (Only allowed to be called by document submitter.)
  ///  
  /// Document must be pending to be certified (note that also previously certified
  /// document can be pending for certification again due to submission amendment).  
  ///
  /// If the document was already signed, the records will be retained;
  /// also if the document was already certified (signed by all signatories),  
  /// the certification will be retained - these acts are irrevokable.
  /// Instead, the document will be not pending for signing any more.  
  /// @param documentHash Keccak256 hash of the document (computed off-chain). (Only previously submitted documents are allowed.)
  function deleteDocumentSubmission(
    bytes32 documentHash)
    external
  {
    // TODO: implement
    // TODO: emit events
    // TODO: unit tests
  }
    
  /// Signs document by the caller account.
  ///    
  /// If the document was previously submitted for certification, its certification 
  /// state will be re-evaluated - if the signatory is last of the required signatories,
  /// document will be certified.
  ///    
  /// Act of document signing (and possible consequent act of certification) is irrevokable. 
  ///  
  /// Note that act of document signing can be done independently of submission 
  /// for certification (or before it happens).
  /// @param documentHash Keccak256 hash of the document (computed off-chain).
  function signDocument(  
    bytes32 documentHash)
    external
  {
      // TODO: implement
      // TODO: emit events
      // TODO: unit tests
  }
  
  /// Returns certification state of given document along with 
  /// comprehensive information about pending or completed certification(s).
  /// @param documentHash Keccak256 hash of the document (computed off-chain).
  /// @return certificationState Certification state.
  /// @return submitter Submitter of the certification. Zero if certificationState = NotSubmitted.
  /// @return currentCertification Current pending or completed certification information.
  /// @return pastCertifications Historical completed certifications (if submission was amended).
  /// @return orphanedSignatures Signatures not required by certification.
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
  }
}