// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISoundToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract SoundRise {
    address public admin;
    ISoundToken public soundToken;

    struct Artist {
        string name;
        address artistAddress;
        bool isRegistered;
    }
    mapping(address => Artist) public artists;
    event ArtistRegistered(address artist, string name);

    struct Song {
        string title;
        address artist;
        uint256 price;
        string ipfsHash;
        uint256 royalty;
        uint256 rating;
        uint256 voteCount;
        bool isEncrypted;
        bool isExclusive;
        uint256 priceInSRT;
    }

    uint256 public songCount;
    mapping(uint256 => Song) public songs;
    mapping(uint256 => mapping(address => bool)) public songPurchased;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event SongUploaded(uint256 songId, string title, address artist, uint256 price, uint256 royalty);
    event SongPurchased(uint256 songId, address buyer);
    event SongPlayed(uint256 songId, address listener);
    event SongRated(uint256 songId, address voter, uint256 rating);
    event SongUpdated(uint256 songId);
    event ExclusiveContentAccessGranted(address user, uint256 songId);

    constructor(address _soundToken) payable {
        admin = msg.sender;
        soundToken = ISoundToken(_soundToken);
    }

    receive() external payable {}
    function deposit() public payable {}
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function registerArtist(string memory _name) public {
        require(!artists[msg.sender].isRegistered, "Already registered");
        artists[msg.sender] = Artist(_name, msg.sender, true);
        emit ArtistRegistered(msg.sender, _name);
    }

    function uploadSong(
        string memory _title,
        uint256 _price,
        string memory _ipfsHash,
        uint256 _royalty,
        bool _isEncrypted,
        bool _isExclusive,
        uint256 _priceInSRT
    ) public {
        require(artists[msg.sender].isRegistered, "Not a registered artist");
        require(_price > 0, "Price must be greater than zero");
        require(_royalty <= 100, "Royalty must be between 0 and 100");

        songCount++;
        songs[songCount] = Song(
            _title, 
            msg.sender, 
            _price, 
            _ipfsHash, 
            _royalty, 
            0, 
            0, 
            _isEncrypted, 
            _isExclusive,
            _priceInSRT
        );
        emit SongUploaded(songCount, _title, msg.sender, _price, _royalty);
    }

    function purchaseSong(uint256 _songId) public payable {
        Song memory song = songs[_songId];
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        require(!song.isExclusive, "Exclusive content cannot be purchased with ETH");
        require(msg.value >= song.price, "Not enough ether");
        require(!songPurchased[_songId][msg.sender], "Song already purchased");

        payable(song.artist).transfer(msg.value);
        songPurchased[_songId][msg.sender] = true;
        emit SongPurchased(_songId, msg.sender);
    }

    function playSong(uint256 _songId) public payable {
        Song memory song = songs[_songId];
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        require(songPurchased[_songId][msg.sender], "You have not purchased this song");

        uint256 royaltyAmount = (msg.value * song.royalty) / 100;
        payable(song.artist).transfer(royaltyAmount);
        emit SongPlayed(_songId, msg.sender);
    }

    function rateSong(uint256 _songId, uint256 _rating) public {
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        require(songPurchased[_songId][msg.sender], "You must purchase the song to rate it");
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        require(!hasVoted[_songId][msg.sender], "You have already rated this song");

        Song storage song = songs[_songId];
        song.rating = ((song.rating * song.voteCount) + _rating) / (song.voteCount + 1);
        song.voteCount++;
        hasVoted[_songId][msg.sender] = true;
        soundToken.mint(msg.sender, 5 * 10 ** 18);
        emit SongRated(_songId, msg.sender, _rating);
    }

    function updateSong(uint256 _songId, string memory _newIpfsHash) public {
        Song storage song = songs[_songId];
        require(msg.sender == song.artist, "Only the artist can update the song");
        song.ipfsHash = _newIpfsHash;
        emit SongUpdated(_songId);
    }

    function redeemExclusiveContent(uint256 _songId) public {
        Song memory song = songs[_songId];
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        require(song.isExclusive, "This song is not exclusive");
        uint256 requiredSRT = song.priceInSRT;
        require(soundToken.balanceOf(msg.sender) >= requiredSRT, "Insufficient SRT balance");

        soundToken.transferFrom(msg.sender, address(this), requiredSRT);
        emit ExclusiveContentAccessGranted(msg.sender, _songId);
    }

    function getSong(uint256 _songId) public view returns (
        string memory title,
        address artist,
        string memory ipfsHash,
        uint256 price,
        uint256 royalty,
        uint256 rating,
        bool isEncrypted,
        bool isExclusive,
        uint256 priceInSRT
    ) {
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        Song memory song = songs[_songId];
        return (song.title, song.artist, song.ipfsHash, song.price, song.royalty, song.rating, song.isEncrypted, song.isExclusive, song.priceInSRT);
    }
}