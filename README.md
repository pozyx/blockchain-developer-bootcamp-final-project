# ethNOS - Ethereum Notary Service

*Final Project for ConsenSys Blockchain Developer Bootcamp 2021*

## Motivation

In real life, there are many situations when legal contract or agreement (paper or electronic document) has to be signed by multiple signatories in order to constitute a legal binding between them. Examples include employment agreements, mortgage agreements, rental contracts and many others.

Historically these were paper documents certified by recognized authorities (such as notaries, solicitors or similar) with a responsibility of verifying identity of all required signatories, witnessing and certifying the act of signing and keeping ledger of all such acts for future legal disputes.

Over time, electronic systems for signing documents by multiple parties started to be more widespread and legally recognized. However, there are disadvantages of such systems - providers are mostly proprietary / closed systems with centralized record keeping without permissionless way to verify validity of signed documents. Blockchain technology is ideal for this purpose as it allows to do all this on an immutable ledger which is always available for everyone to verify.

## Overview

ethNOS is a simple smart contract on Ethereum blockchain and a web front-end which allows to:
- Submit document for signing by multiple parties (as required by submitter).
- Sign document by required signatories specified in document submission.
- Verify validity of document (document is deemed valid when signed by all required parties).
- Monitor real-time events of above state transitions for a given document.

Document can also be submitted without requiring any signatories. In this case, document is recorded as immediately valid and verification is simple proof of document existence.
  
Following guarantees are enforced by cryptographic properties of blockchain:
- Identity of required signatories is verified (signatory account holder performed the signing).
- Document validity is immutably recorded forever for everyone to verify.

Smart contract stores only a hash of a document - only this is required for functionality and guarantees above. Persistence of the document body is out of scope.

## Example workflow

1. Submitter (e.g. mortgage broker) uploads a document (e.g. mortgage agreement) and specifies required signatories (e.g. accounts of lender representative and person taking the mortgage).
2. Submitter asks all parties to sign the document. This is done by traditional means (e.g. email).
3. Each signatory signs the document. (As the document persistence is out of scope of this project, document has to be re-uploaded for signing. Matching hash guarantees that document has not been modified.)
4. Submitter and signatories (or others) can see the signing status and events as they happen.
5. Submitter, signatories or anyone else can verify document validity and see all available information (accounts of signatories, time of each signing, etc.) by uploading the document.

Note: "Uploading document" in this context means only hashing the document on client side - document body is never uploaded / transferred from the user's device.

## Additional features

- To avoid requiring signatories to spend ETH, they will be able to perform the signing as "etherless" transaction. In the above example (see Example workflow) it is not reasonable to expect that signatory (the person taking the mortgage) would be willing to pay just for signing the mortgage agreement, rather than that submitter (the mortgage broker) will bear the cost of this. This will be done using meta-transactions (OpenGSN or similar).
- ENS addresses will be supported.

## TBD

- Ability to amend existing submission of a document (such as adding / removing required signatories) by the submitter will be considered.
- Possibility of submission with signing in one transaction (for cases when submitter is also a signatory) will be considered.

## Ideas for improvements (out of scope)

- Built-in notification between participants (email / push) on document state changes.
- Persistence of the documents (IPFS / FileCoin or integration with traditional cloud services).
- Ability to run arbitrary transaction (smart contract call, etc.) on document verification.