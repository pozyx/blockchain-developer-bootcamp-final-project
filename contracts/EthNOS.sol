// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

contract EthNOS {
  constructor() {
  }

  uint storedData;

  function set(uint x) public {
    storedData = x;
  }

  function get() public view returns (uint) {
    return storedData;
  }
  
}
