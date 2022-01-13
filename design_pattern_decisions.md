# Design patterns used

## Inter-Contract Execution
- [EthNOS](contracts/EthNOS.sol):
  - `fundDocumentSigning` function sends ETH to [EthNOSPaymaster](contracts/EthNOSPaymaster.sol)
  - `withdrawDocumentSigningBalance` function calls `withdrawRelayHubDeposit` function on [EthNOSPaymaster](contracts/EthNOSPaymaster.sol)
- [EthNOSPaymaster](contracts/EthNOSPaymaster.sol)
  - `preRelayedCall` function calls `calculateCharge` on GSN Relay Hub
  - `preRelayedCall` function calls `approveRelayedSignDocumentCall` on [EthNOS](contracts/EthNOS.sol)
  - `postRelayedCall` function calls `calculateCharge` on GSN Relay Hub
  - `postRelayedCall` function calls `chargeRelayedSignDocumentCall` on [EthNOS](contracts/EthNOS.sol)
  - `withdrawRelayHubDeposit` function calls `withdraw` on GSN Relay Hub

## Inheritance and Interfaces
- [EthNOS](contracts/EthNOS.sol)
  - inherits [OpenGSN](https://opengsn.org/) `BaseRelayRecipient` contract (for GSN functionality)
  - inherits [OpenZeppelin](https://openzeppelin.com/) `Ownable` contract (for restricting access to setup functions)
- [EthNOSPaymaster](contracts/EthNOSPaymaster.sol)
  - inherits [OpenGSN](https://opengsn.org/) `BasePaymaster` contract (for GSN functionality)

## Access Control Design Patterns

- [EthNOS](contracts/EthNOS.sol)
  - `Ownable` design pattern used in: `setTrustedForwarder` and `setEthNOSPaymaster` functions - only contact creator can call them