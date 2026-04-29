// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VelumToken is Ownable {
    mapping(address => euint64) internal balances;
    
    string public name;
    string public symbol;
    uint8 public decimals;

    address public complianceMultisig;
    uint64 public flagThreshold; // Unencrypted threshold for demo purposes

    struct EncryptedTransaction {
        address from;
        address to;
        euint64 amount;
        bool isRevealed;
        uint64 revealedAmount;
    }

    mapping(uint256 => EncryptedTransaction) public transactions;
    uint256 public nextTxId;

    event TransferEncrypted(address indexed from, address indexed to, uint256 txId);
    event TransactionRevealed(uint256 indexed txId, uint64 amount);

    modifier onlyCompliance() {
        require(msg.sender == complianceMultisig, "Not authorized");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _complianceMultisig,
        uint64 _flagThreshold
    ) Ownable(msg.sender) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
        complianceMultisig = _complianceMultisig;
        flagThreshold = _flagThreshold;
    }

    // Mint encrypted tokens to owner
    function mint(einput encryptedAmount, bytes calldata inputProof) public onlyOwner {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        balances[msg.sender] = TFHE.add(balances[msg.sender], amount);
    }

    // Encrypted transfer
    function transfer(address to, einput encryptedAmount, bytes calldata inputProof) public {
        euint64 amount = TFHE.asEuint64(encryptedAmount, inputProof);
        
        // Ensure sender has enough balance
        ebool canTransfer = TFHE.le(amount, balances[msg.sender]);
        euint64 transferAmount = TFHE.select(canTransfer, amount, TFHE.asEuint64(0));

        // Update balances
        balances[msg.sender] = TFHE.sub(balances[msg.sender], transferAmount);
        balances[to] = TFHE.add(balances[to], transferAmount);

        // Store transaction for potential compliance review
        uint256 txId = nextTxId++;
        transactions[txId] = EncryptedTransaction({
            from: msg.sender,
            to: to,
            amount: transferAmount,
            isRevealed: false,
            revealedAmount: 0
        });

        // Grant access to the compliance multisig to view this specific transfer amount
        TFHE.allow(transferAmount, complianceMultisig);

        emit TransferEncrypted(msg.sender, to, txId);
    }

    // Get encrypted balance
    function balanceOf(address account) public view returns (euint64) {
        return balances[account];
    }
}
