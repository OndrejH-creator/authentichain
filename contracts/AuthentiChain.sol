// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AuthentiChain
/// @notice Stores SHA-256 document hashes on-chain for integrity verification.
contract AuthentiChain {
    struct HashRecord {
        uint256 timestamp;
        address uploader;
    }

    mapping(bytes32 => HashRecord) private _records;

    event HashStored(
        bytes32 indexed hash,
        address indexed uploader,
        uint256 timestamp
    );

    /// @notice Store a SHA-256 hash with the current timestamp and caller address.
    /// @param hash 32-byte SHA-256 digest of the document.
    function storeHash(bytes32 hash) external {
        require(hash != bytes32(0), "Invalid hash");
        require(_records[hash].timestamp == 0, "Hash already stored");

        _records[hash] = HashRecord({
            timestamp: block.timestamp,
            uploader: msg.sender
        });

        emit HashStored(hash, msg.sender, block.timestamp);
    }

    /// @notice Verify whether a hash is stored and return its metadata.
    /// @param hash SHA-256 digest to look up.
    /// @return stored True if the hash exists on-chain.
    /// @return timestamp Unix timestamp when the hash was stored.
    /// @return uploader Wallet address that submitted the hash.
    function verify(bytes32 hash)
        external
        view
        returns (bool stored, uint256 timestamp, address uploader)
    {
        HashRecord storage record = _records[hash];
        stored = record.timestamp != 0;
        timestamp = record.timestamp;
        uploader = record.uploader;
    }
}
