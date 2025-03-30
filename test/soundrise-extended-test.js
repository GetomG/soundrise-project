const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SoundRise Extended Tests", function () {
  let SoundToken, soundToken, SoundRise, soundRise, owner, artist, buyer, unauthorized;
  const initialSupply = 1000000;

  beforeEach(async function () {
    [owner, artist, buyer, unauthorized] = await ethers.getSigners();

    SoundToken = await ethers.getContractFactory("SoundToken");
    soundToken = await SoundToken.deploy(initialSupply);
    await soundToken.waitForDeployment();

    SoundRise = await ethers.getContractFactory("SoundRise");
    soundRise = await SoundRise.deploy(await soundToken.getAddress());
    await soundRise.waitForDeployment();

    // Move ownership transfer and initial SRT transfer to specific tests where needed
  });

  async function logGas(tx, label) {
    const receipt = await tx.wait();
    console.log(`${label}: Gas Used = ${receipt.gasUsed.toString()}`);
    return receipt.gasUsed;
  }

  // 1. Artist Registration
  describe("Artist Registration", function () {
    it("should allow successful registration", async function () {
      const tx = await soundRise.connect(artist).registerArtist("Test Artist");
      await logGas(tx, "Successful Artist Registration");
      const artistData = await soundRise.artists(artist.address);
      expect(artistData.name).to.equal("Test Artist");
      expect(artistData.isRegistered).to.be.true;
    });

    it("should prevent double registration", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await expect(soundRise.connect(artist).registerArtist("Test Artist 2"))
        .to.be.revertedWith("Already registered");
    });
  });

  // 2. Song Upload
  describe("Song Upload", function () {
    it("should allow registered artist to upload song", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      const tx = await soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      );
      await logGas(tx, "Successful Song Upload");
      const song = await soundRise.songs(1);
      expect(song.ipfsHash).to.equal("ipfs://test");
      expect(song.isExclusive).to.be.false;
    });

    it("should prevent non-registered artist from uploading", async function () {
      await expect(soundRise.connect(unauthorized).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      )).to.be.revertedWith("Not a registered artist");
    });

    it("should prevent upload with zero price", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await expect(soundRise.connect(artist).uploadSong(
        "Test Song", 0, "ipfs://test", 10, false, false, ethers.parseEther("100")
      )).to.be.revertedWith("Price must be greater than zero");
    });

    it("should prevent upload with invalid royalty", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await expect(soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 101, false, false, ethers.parseEther("100")
      )).to.be.revertedWith("Royalty must be between 0 and 100");
    });
  });

  // 3. Song Purchase
  describe("Song Purchase", function () {
    beforeEach(async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      );
    });

    it("should allow ETH purchase of non-exclusive song", async function () {
      const artistInitialBalance = await ethers.provider.getBalance(artist.address);
      const tx = await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
      await logGas(tx, "ETH Song Purchase");
      const artistNewBalance = await ethers.provider.getBalance(artist.address);
      expect(await soundRise.songPurchased(1, buyer.address)).to.be.true;
      expect(artistNewBalance).to.be.above(artistInitialBalance);
    });

    it("should prevent purchase with insufficient ETH", async function () {
      await expect(soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("Not enough ether");
    });

    it("should prevent double purchase", async function () {
      await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
      await expect(soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Song already purchased");
    });

    it("should prevent ETH purchase of exclusive song", async function () {
      await soundRise.connect(artist).uploadSong(
        "Exclusive Song", ethers.parseEther("1"), "ipfs://exclusive", 10, false, true, ethers.parseEther("100")
      );
      await expect(soundRise.connect(buyer).purchaseSong(2, { value: ethers.parseEther("1") }))
        .to.be.revertedWith("Exclusive content cannot be purchased with ETH");
    });
  });

  // 4. Exclusive Content Redemption
  describe("Exclusive Content Redemption", function () {
    beforeEach(async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Exclusive Song", ethers.parseEther("1"), "ipfs://exclusive", 10, false, true, ethers.parseEther("100")
      );
      await soundToken.connect(owner).transfer(buyer.address, ethers.parseEther("1000"));
      await soundToken.connect(buyer).approve(await soundRise.getAddress(), ethers.parseEther("1000"));
    });

    it("should allow SRT redemption", async function () {
      const tx = await soundRise.connect(buyer).redeemExclusiveContent(1);
      await logGas(tx, "SRT Exclusive Redemption");
      const newBalance = await soundToken.balanceOf(buyer.address);
      expect(newBalance).to.equal(ethers.parseEther("900"));
    });

    it("should prevent redemption with insufficient SRT", async function () {
      await soundToken.connect(buyer).transfer(unauthorized.address, ethers.parseEther("950"));
      await expect(soundRise.connect(buyer).redeemExclusiveContent(1))
        .to.be.revertedWith("Insufficient SRT balance");
    });
  });

  // 5. Song Rating and SRT Rewards
  describe("Song Rating", function () {
    beforeEach(async function () {
      await soundToken.connect(owner).transferOwnership(await soundRise.getAddress()); // SoundRise needs to mint
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      );
      await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
    });

    it("should allow rating and reward SRT", async function () {
      const initialBalance = await soundToken.balanceOf(buyer.address);
      const tx = await soundRise.connect(buyer).rateSong(1, 3);
      await logGas(tx, "Song Rating with Reward");
      const song = await soundRise.songs(1);
      const newBalance = await soundToken.balanceOf(buyer.address);
      expect(song.rating).to.equal(3);
      expect(newBalance).to.equal(initialBalance + ethers.parseEther("5"));
    });

    it("should prevent rating without purchase", async function () {
      await expect(soundRise.connect(unauthorized).rateSong(1, 3))
        .to.be.revertedWith("You must purchase the song to rate it");
    });

    it("should prevent double rating", async function () {
      await soundRise.connect(buyer).rateSong(1, 3);
      await expect(soundRise.connect(buyer).rateSong(1, 4))
        .to.be.revertedWith("You have already rated this song");
    });
  });

  // 6. Event Emission
  describe("Event Emission", function () {
    it("should emit SongUploaded", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await expect(soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      )).to.emit(soundRise, "SongUploaded").withArgs(1, "Test Song", artist.address, ethers.parseEther("1"), 10);
    });

    it("should emit SongPurchased", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      );
      await expect(soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") }))
        .to.emit(soundRise, "SongPurchased").withArgs(1, buyer.address);
    });

    it("should emit SongRated", async function () {
      await soundToken.connect(owner).transferOwnership(await soundRise.getAddress());
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      );
      await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
      await expect(soundRise.connect(buyer).rateSong(1, 3))
        .to.emit(soundRise, "SongRated").withArgs(1, buyer.address, 3);
    });

    it("should emit ExclusiveContentAccessGranted", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Exclusive Song", ethers.parseEther("1"), "ipfs://exclusive", 10, false, true, ethers.parseEther("100")
      );
      await soundToken.connect(owner).transfer(buyer.address, ethers.parseEther("1000"));
      await soundToken.connect(buyer).approve(await soundRise.getAddress(), ethers.parseEther("1000"));
      await expect(soundRise.connect(buyer).redeemExclusiveContent(1))
        .to.emit(soundRise, "ExclusiveContentAccessGranted").withArgs(buyer.address, 1);
    });
  });

  // 7. Ownership and Access Control
  describe("Ownership", function () {
    it("should restrict minting to owner", async function () {
      await expect(soundToken.connect(unauthorized).mint(buyer.address, ethers.parseEther("10")))
        .to.be.revertedWithCustomError(soundToken, "OwnableUnauthorizedAccount");
    });
  });

  // 9. Token Minting and Transfer
  describe("Token Minting", function () {
    it("should allow owner to mint tokens", async function () {
      const tx = await soundToken.connect(owner).mint(buyer.address, ethers.parseEther("10"));
      await logGas(tx, "Owner Minting Tokens");
      const balance = await soundToken.balanceOf(buyer.address);
      expect(balance).to.equal(ethers.parseEther("10"));
    });
  });

  // 10. Edge Cases
  describe("Edge Cases", function () {
    it("should handle zero royalty", async function () {
      await soundRise.connect(artist).registerArtist("Test Artist");
      const tx = await soundRise.connect(artist).uploadSong(
        "Zero Royalty Song", ethers.parseEther("1"), "ipfs://test", 0, false, false, ethers.parseEther("100")
      );
      await logGas(tx, "Upload with Zero Royalty");
      const song = await soundRise.songs(1);
      expect(song.royalty).to.equal(0);
    });

    it("should prevent negative rating", async function () {
      await soundToken.connect(owner).transferOwnership(await soundRise.getAddress());
      await soundRise.connect(artist).registerArtist("Test Artist");
      await soundRise.connect(artist).uploadSong(
        "Test Song", ethers.parseEther("1"), "ipfs://test", 10, false, false, ethers.parseEther("100")
      );
      await soundRise.connect(buyer).purchaseSong(1, { value: ethers.parseEther("1") });
      await expect(soundRise.connect(buyer).rateSong(1, 0))
        .to.be.revertedWith("Rating must be between 1 and 5");
    });
  });
});