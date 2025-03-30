// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISoundToken {
    function balanceOf(address account) external view returns (uint256);
}

contract ArtistBalance {
    ISoundToken public soundToken;

    constructor(address _soundTokenAddress) {
        require(_soundTokenAddress != address(0), "Invalid token address");
        soundToken = ISoundToken(_soundTokenAddress);
    }

    function getSoundTokenBalance(address artist) public view returns (uint256) {
        return soundToken.balanceOf(artist);
    }

    function getETHBalance(address artist) public view returns (uint256) {
        return artist.balance;
    }
}