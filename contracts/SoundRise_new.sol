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

    // Artist structure and registration mapping
    struct Artist {
        string name;
        address artistAddress;
        bool isRegistered;
    }
    mapping(address => Artist) public artists;
    event ArtistRegistered(address artist, string name);

    // Song structure and registration mapping
    struct Song {
        string title;
        address artist;
        uint256 price;            // Price in ETH
        string ipfsHash;          // IPFS hash of the song
        uint256 royalty;          // Royalty percentage (0 to 100)
        uint256 rating;           // Average rating
        uint256 voteCount;        // Number of votes
        bool isEncrypted;         // Flag for encryption
        bool isExclusive;         // Flag for exclusivity
        uint256 priceInSRT;       // Price in SRT for exclusive content
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
    event ExclusiveContentAccessGranted(address user, uint256 songId); // New event for exclusive content access

    constructor(address _soundToken) payable {
        admin = msg.sender;
        soundToken = ISoundToken(_soundToken); // Initialize the SoundToken contract
    }

    receive() external payable {}
    function deposit() public payable {}
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Register an artist (called by the artist)
    function registerArtist(string memory _name) public {
        require(!artists[msg.sender].isRegistered, "Already registered");
        artists[msg.sender] = Artist(_name, msg.sender, true);
        emit ArtistRegistered(msg.sender, _name);
    }

    // Upload a song (only by registered artists)
    function uploadSong(
        string memory _title,
        uint256 _price,
        string memory _ipfsHash,
        uint256 _royalty,
        bool _isEncrypted,
        bool _isExclusive,        // New parameter to mark if the song is exclusive
        uint256 _priceInSRT      // New parameter to specify the price in SRT for exclusive content
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
            _isExclusive,        // Store whether the song is exclusive
            _priceInSRT          // Store the price in SRT for exclusive songs
        );
        emit SongUploaded(songCount, _title, msg.sender, _price, _royalty);
    }

    // Purchase a song
    // function purchaseSong(uint256 _songId) public payable {
    //     Song memory song = songs[_songId];
    //     require(_songId > 0 && _songId <= songCount, "Song does not exist");
    //     require(msg.value >= song.price, "Not enough ether to purchase the song");
    //     require(!songPurchased[_songId][msg.sender], "Song already purchased");

    //     payable(song.artist).transfer(msg.value);
    //     songPurchased[_songId][msg.sender] = true;
    //     emit SongPurchased(_songId, msg.sender);
    // }

    function purchaseSong(uint256 _songId) public payable {
    Song memory song = songs[_songId];
    require(_songId > 0 && _songId <= songCount, "Song does not exist");

    // Prevent ETH purchase for exclusive content
    require(!song.isExclusive, "Exclusive content cannot be purchased with ETH. Please use SRT to redeem exclusive content.");

    // Regular song purchase logic: ETH can be used for non-exclusive songs
    require(msg.value >= song.price, "Not enough ether to purchase the song");
    require(!songPurchased[_songId][msg.sender], "Song already purchased");

    // Send ETH to the artist
    payable(song.artist).transfer(msg.value);
    songPurchased[_songId][msg.sender] = true;
    emit SongPurchased(_songId, msg.sender);
    }


    // Play a song (pay royalties to artist)
    function playSong(uint256 _songId) public payable {
        Song memory song = songs[_songId];
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        require(songPurchased[_songId][msg.sender], "You have not purchased this song");

        uint256 royaltyAmount = (msg.value * song.royalty) / 100;
        payable(song.artist).transfer(royaltyAmount);
        emit SongPlayed(_songId, msg.sender);
    }

    // Rate a song
    function rateSong(uint256 _songId, uint256 _rating) public {
        require(_songId > 0 && _songId <= songCount, "Song does not exist");
        require(songPurchased[_songId][msg.sender], "You must purchase the song to rate it");
        require(_rating >= 1 && _rating <= 5, "Rating must be between 1 and 5");
        require(!hasVoted[_songId][msg.sender], "You have already rated this song");

        Song storage song = songs[_songId];
        song.rating = ((song.rating * song.voteCount) + _rating) / (song.voteCount + 1);
        song.voteCount++;
        hasVoted[_songId][msg.sender] = true;

        // 🎉 Reward 5 SRT for rating
        soundToken.mint(msg.sender, 5 * 10 ** 18);  // Mint 5 SRT tokens to the user

        emit SongRated(_songId, msg.sender, _rating);
    }

    // Update song details (only the artist can update their own song)
    function updateSong(uint256 _songId, string memory _newIpfsHash) public {
        Song storage song = songs[_songId];
        require(msg.sender == song.artist, "Only the artist can update the song");
        song.ipfsHash = _newIpfsHash;
        emit SongUpdated(_songId);
    }

    // Check if the user has enough SRT tokens to access exclusive content
    function redeemExclusiveContent(uint256 _songId) public {
        Song memory song = songs[_songId];
        require(_songId > 0 && _songId <= songCount, "Song does not exist");

        // Ensure the song is exclusive
        require(song.isExclusive, "This song is not exclusive");

        uint256 requiredSRT = song.priceInSRT;  // Use the price in SRT from the song data
        uint256 userBalance = soundToken.balanceOf(msg.sender);

        require(userBalance >= requiredSRT, "Insufficient SRT balance to access this content");

        // Deduct the required SRT tokens
        soundToken.transferFrom(msg.sender, address(this), requiredSRT);

        // Grant access (you can define what "access" means — for example, marking the song as "redeemed")
        emit ExclusiveContentAccessGranted(msg.sender, _songId);
    }

    // Get song information (public function)
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