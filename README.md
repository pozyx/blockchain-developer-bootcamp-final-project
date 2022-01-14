# ethNOS - Ethereum Notary Service

*Final Project for ConsenSys Blockchain Developer Bootcamp 2021*

Jump to [Getting started](#getting-started)

## About

### Motivation

In real life, there are many situations when legal contract or agreement (paper or electronic document) must be signed by multiple signatories to constitute a legal binding between them. Examples include employment agreements, mortgage agreements, rental contracts and many others.

Historically these were paper documents certified by recognized authorities (such as notaries, solicitors or similar) with a responsibility of verifying identity of all required signatories, witnessing and certifying the act of signing and keeping ledger of all such acts for future legal disputes.

Over time, electronic systems for signing documents by multiple parties started to be more widespread and legally recognized. However, there are disadvantages of such systems - providers are mostly proprietary / closed systems with centralized record keeping without permissionless way to verify validity of signed documents. Blockchain technology is ideal for this purpose as it allows to do all this on an immutable ledger which is always available for everyone to verify.

### Overview

ethNOS is a smart contract on Ethereum blockchain and a web front-end which allows to:
- Submit document for signing by multiple parties (as required by submitter).
- Sign document by required signatories specified in document submission.
- Verify validity of document (document is deemed certified when signed by all required parties).
- Monitor real-time events of above state transitions for a given document.

Document can also be submitted without requiring any signatories. In this case, document is recorded as immediately certified and this constitutes proof of the document existence.

Following guarantees are enforced by cryptographic properties of blockchain:
- Identity of required signatories is verified (signatory account holder performs the signing).
- Document validity is immutably recorded forever for everyone to verify.

Smart contract stores only cryptographic hash of a document - only this is required for functionality and guarantees above. Persistence of the document body is out of scope.

### Example workflow

1. Submitter (e.g. mortgage broker) uploads a document (e.g. mortgage agreement) and specifies required signatories (e.g. accounts of lender representative and person taking the mortgage).
2. Submitter asks all parties to sign the document. This is done by traditional means (e.g. email).
3. Each signatory signs the document. (As the document persistence is out of scope of this project, document must be re-uploaded for signing. Matching hash guarantees that document has not been modified.)
4. Submitter and signatories (or anyone else) can see the certification status and events as they happen.
5. Submitter, signatories or anyone else can verify document validity and see all available information (accounts of signatories, time of each signing, etc.) by uploading the document.

Note: "Uploading document" in this context means only hashing the document on client side - document body is never uploaded / transferred from the user's device!

### "Etherless" signing

- To avoid requiring signatories to spend ETH, they can perform the signing as etherless transaction. In the above example (see Example workflow) it is not reasonable to expect that signatory (the person taking the mortgage) would be willing to pay just for signing the mortgage agreement, rather than that submitter (the mortgage broker) will bear the cost of this.
- Submitter can fund the signing of specific document and this enables signatories to sign the document "for free". This is done by leveraging [OpenGSN](https://opengsn.org/).

## Getting started

### Running the app

Deployed web app location: [ethNOS.surge.sh](https://ethnos.surge.sh/)

*Supported networks are `Rinkeby` and `localhost:8545.`*

### Repository structure

- [contracts](contracts)
  - [EthNOS.sol](contracts/EthNOS.sol) - main contract
  - [EthNOSPaymaster.sol](contracts/EthNOSPaymaster.sol) - GSN paymaster contract for above
- [migrations](migrations), [test](test) - as per usual Truffle convention
- [web](web) - web app front-end (Angular)

### Prerequisites and repository initialization

- `Linux`, `Mac` or `WSL2` (Some convenience scripts do not work with vanilla `Windows` setup)
- Install `LTS` (not `latest`) version of `Node.js` and `npm` (tested with `Node.js` ver. `16.13.2` and `npm` ver. `8.3.1`) - this can by done as follows:
  - [install nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
  - `nvm install --lts`
  - `nvm install-latest-npm`
- Install required global tools:
  - `npm install -g yarn`
  - `npm install -g truffle`
  - `npm install -g @angular/cli`
- Clone the repository and install dependencies:
  - `git clone https://github.com/pozyx/blockchain-developer-bootcamp-final-project.git`
  - `cd blockchain-developer-bootcamp-final-project`
  - `yarn`
  - `cd web`
  - `yarn`
- [optional] Create [`.env`](https://github.com/motdotla/dotenv) file in repository root with your testing wallet mnemonic and registered [Infura](https://infura.io/) API key
  - If set:
    - For convenience, your wallet will be pre-funded with 1 ETH when running locally
    - You will be able to deploy the contracts
  - Format of `.env` file content:
    ```
    MNEMONIC=[YOUR_MNEMONIC]
    INFURA_API_KEY=[YOUR_INFURA_API_KEY]
    ```

### Running tests

`yarn test`
- unit tests thoroughly covering all contract functionality except etherless signing
- script starts `ganache-cli` (port: `8545`), deploys the contract locally and runs tests using `truffle`

`yarn test-with-gsn`
- unit tests thoroughly covering all contract functionality including etherless signing
- script starts `ganache-cli` (port: `8545`), `gsn` (random port), deploys the contract locally (including GSN paymaster contract) and runs tests using `truffle`

### Running the contract and app locally

`yarn start`
- local run of the contract without etherless signing functionality
- script starts `ganache-cli` (port: `8545`), deploys the contract locally, updates contract ABI in web project and runs truffle console
- if wallet mnemonic is present in [`.env`](https://github.com/motdotla/dotenv) file, your wallet will be pre-funded with 1 ETH

`yarn start-with-gsn`
- local run of the contract including etherless signing functionality
- script starts `ganache-cli` (port: `8545`), `gsn` (random port), deploys the contract locally (including GSN paymaster contract), updates contract ABI in web project and runs truffle console
- if wallet mnemonic is present in [`.env`](https://github.com/motdotla/dotenv) file, your wallet will be pre-funded with 1 ETH
- On WSL systems, etherless transactions may not work due to WSL networking setup (local relayer cannot be reached from browser).

`yarn start` in [web](web) directory
- local run of web app
- navigate to (http://localhost:4200/)
- in MetaMask, switch network to `localhost:8545` to connect to local network started with either command above, or to `Rinkeby` public testnet
- If you get `TXRejectedError` when sending a transaction, reset your Metamask account from Advanced settings.

### Deploying the contract and app

`yarn deploy-rinkeby`
- deployment of contracts to `Rinkeby` public testnet
- script deploys the contracts (older version of contracts are ignored) and updates contract ABI in web project
- [`.env`](https://github.com/motdotla/dotenv) file filled as described above is required

`yarn deploy-mainnet`
- deployment of contracts to mainnet
- script deploys the contracts and updates contract ABI in web project
- [`.env`](https://github.com/motdotla/dotenv) file filled as described above is required

`yarn deploy` in [web](web) directory
- deployment of web app to [ethNOS.surge.sh](https://ethnos.surge.sh/)

## Other

### Mandatory information (for Bootcamp)

- [Final project checklist](final-project-checklist.txt)
- [Design pattern decisions](design_pattern_decisions.md)
- [Avoiding common attacks](avoiding_common_attacks.md)
- [Address of the deployed contract](deployed_address.txt)
- Public Ethereum account for certification: 0x6fBA66b8E73aEA05A9B050ba8Df2e14A1684fdF7

### Ideas for future improvements

- Support of [ENS](https://ens.domains/) addresses.
- Ability to amend existing submission of a document (adding / removing required signatories), ability to delete (pending only) submission
  by the submitter and ability to show history of such actions. This is implemented in contract (but not in web app). See comments in [EthNOS.sol](contracts/EthNOS.sol) for more information.
- Ability to fund for etherless signing as part of the submission transaction. This is implemented in contract (but not in web app).
- Estimate and suggest appropriate funding amount for etherless signing.
- Ability to run arbitrary transaction (smart contract call, etc.) on document certification.
- Persistence of the documents ([IPFS](https://ipfs.io/) / [FileCoin](https://filecoin.io/) or integration with traditional cloud services).
- Built-in notification between participants (email / push) on document state changes.

### Known issues

- Accounting of balance for etherless signing is not fully consistent with balance kept in relay hub due to inherent indeterminism of precise transaction cost. This balance mismatch can cause error in document balance withdrawal (when relay hub balance is lower than expected). This issue should be revisited and addressed.
- Related to above, cost of `postRelayedCall` function of [EthNOSPaymaster](contracts/EthNOSPaymaster.sol) is currently set to a rough estimate. This should be set to more accurate value (via `setPostGasUsage` function of [EthNOSPaymaster](contracts/EthNOSPaymaster.sol)).
- Sometimes page does not refresh after transaction is complete.
- Etherless signing sometimes yields to duplicated display of MetaMask confirmation dialog.
- Etherless signing causes MetaMask error (it works ok, error is only visible in console). [Cause](https://forum.opengsn.org/t/metamask-rpc-error-already-known/93)
- Chrome: If web app is navigated to too quickly after browser start-up, it will not be possible to connect it to MetaMask until page refresh.
- If initial connect to MetaMask is ignored, page is refreshed and MetaMask connection is confirmed afterwards, app will not detect the connection.