// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IConfidentialToken {
    function transactions(uint256 txId) external view returns (
        address from,
        address to,
        uint256 amount, // Actually euint64 in FHE but returns handle as uint256
        bool isRevealed,
        uint64 revealedAmount
    );
}

contract ComplianceMultisig {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    struct DecryptRequest {
        uint256 txId;
        uint256 approvals;
        bool executed;
    }

    mapping(uint256 => DecryptRequest) public requests;
    uint256 public nextRequestId;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    event RequestCreated(uint256 indexed requestId, uint256 indexed txId);
    event RequestApproved(uint256 indexed requestId, address indexed owner);
    event RequestExecuted(uint256 indexed requestId, uint256 indexed txId);

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "Owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Duplicate owner");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        threshold = _threshold;
    }

    function submitDecryptRequest(uint256 txId) public onlyOwner returns (uint256) {
        uint256 requestId = nextRequestId++;
        requests[requestId] = DecryptRequest({
            txId: txId,
            approvals: 0,
            executed: false
        });

        emit RequestCreated(requestId, txId);
        approveRequest(requestId);
        return requestId;
    }

    function approveRequest(uint256 requestId) public onlyOwner {
        DecryptRequest storage request = requests[requestId];
        require(!request.executed, "Already executed");
        require(!hasApproved[requestId][msg.sender], "Already approved");

        hasApproved[requestId][msg.sender] = true;
        request.approvals += 1;

        emit RequestApproved(requestId, msg.sender);

        if (request.approvals >= threshold) {
            executeRequest(requestId);
        }
    }

    function executeRequest(uint256 requestId) internal {
        DecryptRequest storage request = requests[requestId];
        require(!request.executed, "Already executed");
        require(request.approvals >= threshold, "Threshold not met");

        request.executed = true;
        
        // In a full fhEVM environment, the multisig (which was granted TFHE.allow access
        // by the token contract) would now interact with a Gateway or Reencryption 
        // to view the value. For this demo, the multisig confirms the threshold 
        // is met, allowing the off-chain compliance client to query the value 
        // using the multisig's credentials or an oracle.
        
        emit RequestExecuted(requestId, request.txId);
    }
}
