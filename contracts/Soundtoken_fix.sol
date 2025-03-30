// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoundToken is ERC20, Ownable {
    // Allow external minters like the SoundRise contract
    mapping(address => bool) public minters;

    modifier onlyMinter() {
        require(minters[msg.sender], "Not an authorized minter");
        _;
    }

    constructor(uint256 initialSupply) ERC20("SoundToken", "SRT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // Owner can authorize a contract to mint tokens
    function addMinter(address minter) public onlyOwner {
        minters[minter] = true;
    }

    // Only authorized minters can mint new tokens
    function mint(address to, uint256 amount) public onlyMinter {
        _mint(to, amount);
    }
}