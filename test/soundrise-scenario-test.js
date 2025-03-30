const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoundRise Scenario Test", function () {
  let SoundToken, soundToken, SoundRise, soundRise, owner, artist, listener;
  const initialSupply = 1000000;

  async function logGas(tx, label) {
    const receipt = await tx.wait();
    console.log(`${label}: Gas Used = ${receipt.gasUsed.toString()}`);
    return receipt.gasUsed;
  }

  async function logBalances(artistAddr, listenerAddr, label) {
    const artistEth = await ethers.provider.getBalance(artistAddr);
    const artistSrt = await soundToken.balanceOf(artistAddr);
    const listenerEth = await ethers.provider.getBalance(listenerAddr);
    const listenerSrt = await soundToken.balanceOf(listenerAddr);
    console.log(`\n${label}:`);
    console.log(`Artist ETH: ${ethers.formatEther(artistEth)} ETH`);
    console.log(`Artist SRT: ${ethers.formatEther(artistSrt)} SRT`);
    console.log(`Listener ETH: ${ethers.formatEther(listenerEth)} ETH`);
    console.log(`Listener SRT: ${ethers.formatEther(listenerSrt)} SRT`);
  }

  beforeEach(async function () {
    [owner, artist, listener] = await ethers.getSigners();

    // Deploy SoundToken
    SoundToken = await ethers.getContractFactory("SoundToken");
    soundToken = await SoundToken.deploy(initialSupply);
    await soundToken.waitForDeployment();

    // Deploy SoundRise
    SoundRise = await ethers.getContractFactory("SoundRise");
    soundRise = await SoundRise.deploy(await soundToken.getAddress());
    await soundRise.waitForDeployment();

    // Transfer ownership to SoundRise for minting rewards
    await soundToken.connect(owner).transferOwnership(await soundRise.getAddress());

    // Initial token distribution: 100 SRT each to artist and listener
    await soundToken.connect(owner).transfer(artist.address, ethers.parseEther("100"));
    await soundToken.connect(owner).transfer(listener.address, ethers.parseEther("100"));
  });

  it("Scenario: Artist and Listener Interactions", async function () {
    // Log initial balances
    await logBalances(artist.address, listener.address, "Initial Balances");

    // Artist registers
    await logGas(
      await soundRise.connect(artist).registerArtist("Test Artist"),
      "Artist Registration"
    );

    // Artist uploads 2 songs
    await logGas(
      await soundRise.connect(artist).uploadSong(
        "Song 1", ethers.parseEther("1"), "ipfs://song1", 10, false, false, ethers.parseEther("100")
      ),
      "Upload Song 1"
    );
    await logGas(
      await soundRise.connect(artist).uploadSong(
        "Song 2", ethers.parseEther("1"), "ipfs://song2", 10, false, false, ethers.parseEther("100")
      ),
      "Upload Song 2"
    );

    // Listener buys Song 1
    await logGas(
      await soundRise.connect(listener).purchaseSong(1, { value: ethers.parseEther("1") }),
      "Listener Buys Song 1"
    );

    // Listener buys Song 2 (to allow listening)
    await logGas(
      await soundRise.connect(listener).purchaseSong(2, { value: ethers.parseEther("1") }),
      "Listener Buys Song 2"
    );

    // Listener listens to Song 2 10 times
    for (let i = 0; i < 10; i++) {
      await logGas(
        await soundRise.connect(listener).playSong(2, { value: ethers.parseEther("1") }),
        `Listen to Song 2 - Play ${i + 1}`
      );
    }

    // Listener rates Song 1 and mints tokens
    await logGas(
      await soundRise.connect(listener).rateSong(1, 4),
      "Listener Rates Song 1"
    );

    // Log final balances
    await logBalances(artist.address, listener.address, "Final Balances");

    // Verify minted tokens for listener using bigint subtraction
    const listenerSrt = await soundToken.balanceOf(listener.address);
    const initialSrt = ethers.parseEther("100");
    const mintedSrt = listenerSrt - initialSrt; // bigint subtraction
    console.log(`Listener Minted Tokens: ${ethers.formatEther(mintedSrt)} SRT`);

    // Assertions to verify balances
    expect(await soundToken.balanceOf(artist.address)).to.equal(ethers.parseEther("100"));
    expect(await ethers.provider.getBalance(artist.address)).to.be.above(ethers.parseEther("10001"));
    expect(await soundToken.balanceOf(listener.address)).to.equal(ethers.parseEther("105"));
  });
});