# 🎵 SoundRise

**SoundRise** is a decentralized music distribution platform built on Ethereum. It enables artists to publish and monetize their work through smart contracts, decentralized storage (IPFS), and secure access via proxy re-encryption. The platform also introduces a native utility token (SRT) to incentivize participation and engagement across the ecosystem.

## 🔧 Features

- 🎤 **Artist Registration & Music Upload**  
  Artists can register and upload songs, which are encrypted and stored on IPFS.

- 🔐 **Proxy Re-Encryption**  
  Audio files are securely shared with listeners via Umbral proxy re-encryption, allowing controlled access without revealing the original private key (still in demo).

- 💸 **Smart Contracts on Ethereum**  
  Core logic for licensing, ownership, payments, and interaction rewards is implemented in Solidity.

- 🪙 **SoundRise Token (SRT)**  
  An ERC-20 token used for incentivizing uploads, curation, and listener interaction.

- 📦 **Decentralized Storage (IPFS)**  
  All audio content is stored off-chain using IPFS for permanence and censorship resistance.

## 🛠️ Tech Stack

- **Ethereum** (Solidity, Hardhat)
- **IPFS** for decentralized storage
- **NuCypher Umbral** for proxy re-encryption
- **Python** for encryption scripts
- **ERC-20 SRT Token** for platform incentives

## 🚀 Getting Started

### Prerequisites
- Node.js and npm
- Python 3.8+
- Hardhat
- IPFS CLI (optional)
- Ganache or another local Ethereum node (for testing)

### Smart Contracts
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### 📜 Smart Contract Highlights

- `registerArtist(string name)`
- `uploadSong(string title, uint price, string ipfsHash, ...)`
- `purchaseSong(uint songId)` — ETH-based song purchase
- `redeemExclusiveContent(uint songId)` — SRT-based access to exclusive content
- `rateSong(uint songId, uint rating)` — Rate a purchased song
- `playSong(uint songId)` — Play and pay royalties

## 📈 Future Plans

- DAO-based community governance
- Full web/mobile UI
- DID-based listener verification
- Real-world artist onboarding
