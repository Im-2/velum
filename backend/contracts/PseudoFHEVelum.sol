// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PseudoFHEVelum {
    string public name = "Velum Token";
    string public symbol = "VLM";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    address public owner;

    event TransferEncrypted(address indexed from, bytes ciphertext);

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == owner, "Only owner");
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    // Stealth transfer function
    // Expects ciphertext to contain the uint256 amount in the first 32 bytes, followed by random noise
    function encryptedTransfer(address to, bytes calldata ciphertext) public {
        require(ciphertext.length >= 32, "Invalid ciphertext length");
        
        uint256 amount;
        assembly {
            // Load the first 32 bytes of ciphertext after the length prefix
            amount := calldataload(ciphertext.offset)
        }

        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        // Emit an event that Etherscan cannot easily parse as a standard token transfer
        emit TransferEncrypted(msg.sender, ciphertext);
    }
}
