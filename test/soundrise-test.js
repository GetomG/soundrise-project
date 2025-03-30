const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoundRise Contract with Gas Analysis", function () {
  let SoundToken, soundToken, SoundRise, soundRise, owner, artist, buyer;
  const initialSupply = 1000000;

  beforeEach(async function () {
    [owner, artist, buyer] = await ethers.getSigners();

    SoundToken = await ethers.getContractFactory("SoundToken");
    soundToken = await SoundToken.deploy(initialSupply);
    await soundToken.waitForDeployment();

    SoundRise = await ethers.getContractFactory("SoundRise");
    soundRise = await SoundRise.deploy(await soundToken.getAddress());
    await soundRise.waitForDeployment();

    await soundToken.transferOwnership(await soundRise.getAddress());
    await soundToken.transfer(buyer.address, ethers.parseEther("1000"));
  });

  async function logGas(tx, label) {
    const receipt = await tx.wait();
    console.log(`${label}: Gas Used = ${receipt.gasUsed.toString()}`);
    return receipt.gasUsed;
  }

  it("should register an artist", async function () {
    const tx = await soundRise.connect(artist).registerArtist("Test Artist");
    await logGas(tx, "Register Artist");
    const artistData = await soundRise.artists(artist.address);
    expect(artistData.name).to.equal("Test Artist");
  });

  it("should upload a song", async function () {
    await soundRise.connect(artist).registerArtist("Test Artist");
    const tx = await soundRise.connect(artist).uploadSong(
      "Test Song",
      ethers.parseEther("1"),
      "ipfs://test",
      10,
      false,
      false,
      ethers.parseEther("100")
    );
    await logGas(tx, "Upload Song");
    const song = await soundRise.songs(1);
    expect(song.title).to.equal("Test Song");
  });

  it("should allow purchasing a song with ETH", async function () {
    await soundRise.connect(artist).registerArtist("Test Artist");
    await soundRise.connect(artist).uploadSong(
      "Test Song",
      ethers.parseEther("1"),
      "ipfs://test",
      10,
      false,
      false,
      ethers.parseEther("100")
    );
    const tx = await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
    await logGas(tx, "Purchase Song with ETH");
    expect(await soundRise.songPurchased(1, buyer.address)).to.be.true;
  });

  it("should allow playing a song and paying royalties", async function () {
    await soundRise.connect(artist).registerArtist("Test Artist");
    await soundRise.connect(artist).uploadSong(
      "Test Song",
      ethers.parseEther("1"),
      "ipfs://test",
      10,
      false,
      false,
      ethers.parseEther("100")
    );
    await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
    const tx = await soundRise.connect(buyer).playSong(1, { value: ethers.parseEther("1") });
    await logGas(tx, "Play Song with Royalty");
  });

  it("should allow rating a song and mint tokens", async function () {
    await soundRise.connect(artist).registerArtist("Test Artist");
    await soundRise.connect(artist).uploadSong(
      "Test Song",
      ethers.parseEther("1"),
      "ipfs://test",
      10,
      false,
      false,
      ethers.parseEther("100")
    );
    await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
    const tx = await soundRise.connect(buyer).rateSong(1, 3);
    await logGas(tx, "Rate Song and Mint Tokens");
    const song = await soundRise.songs(1);
    expect(song.rating).to.equal(3);
  });

  it("should redeem exclusive content with SRT", async function () {
    await soundToken.connect(buyer).approve(await soundRise.getAddress(), ethers.parseEther("1000"));
    await soundRise.connect(artist).registerArtist("Test Artist");
    await soundRise.connect(artist).uploadSong(
      "Exclusive Song",
      ethers.parseEther("1"),
      "ipfs://exclusive",
      10,
      false,
      true,
      ethers.parseEther("100")
    );
    const tx = await soundRise.connect(buyer).redeemExclusiveContent(1);
    await logGas(tx, "Redeem Exclusive Content");
    const newBalance = await soundToken.balanceOf(buyer.address);
    expect(newBalance).to.equal(ethers.parseEther("900")); // 1000 - 100
  });
});