# VELUM: Encrypted ERC-20 with Threshold Multisig Decryption

A confidential ERC-20 style token leveraging Fully Homomorphic Encryption (FHE) on Zama's fhEVM. This project bridges the gap between privacy and regulatory requirements.

Balances and transfers are fully encrypted. Everyone sees zero. However, transactions exceeding a certain size are automatically flagged. A designated "Compliance Key" (managed by an M-of-N threshold multisig) can decrypt flagged transactions for AML/KYC review.

## Features
- **FHE Token**: Balances and transfers are encrypted using `euint64`.
- **Automatic Flagging**: Transactions over a threshold are flagged automatically.
- **Threshold Multisig Compliance**: Only when an M-of-N multisig threshold is met can a transaction be decrypted.
- **Terminal Dashboard**: A dark, financial-terminal aesthetic UI built with React and Tailwind CSS.

## Project Structure
- `backend/`: Hardhat project containing the fhEVM smart contracts (`ConfidentialToken.sol`, `ComplianceMultisig.sol`).
- `frontend/`: Vite + React frontend dashboard.

## Setup Instructions

### Backend (Smart Contracts)
The backend is configured to use Hardhat and the Zama `fhevm` libraries. It is set up for deployment on the Sepolia testnet.

1. Navigate to the backend directory:
   \`\`\`bash
   cd backend
   \`\`\`
2. Install dependencies (requires Node.js):
   \`\`\`bash
   npm install
   \`\`\`
3. Create a `.env` file with your credentials:
   \`\`\`
   SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
   PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY"
   \`\`\`
4. Compile the contracts:
   \`\`\`bash
   npx hardhat compile
   \`\`\`
5. Deploy to Sepolia:
   \`\`\`bash
   npx hardhat run scripts/deploy.js --network sepolia
   \`\`\`

### Frontend (Dashboard)
1. Navigate to the frontend directory:
   \`\`\`bash
   cd frontend
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Open your browser to the local URL (usually `http://localhost:5173`) to view the terminal.

## Architecture

1. **ConfidentialToken**: Users transfer funds using `TFHE.asEuint64()`. The contract checks if `transferAmount > FLAG_THRESHOLD`. If so, it flags it. The contract grants the `ComplianceMultisig` access to the encrypted value using `TFHE.allow()`.
2. **ComplianceMultisig**: Officers submit decryption requests for flagged transactions. Once approvals reach the threshold, the multisig triggers the execution, enabling the off-chain reading of the value (using fhEVM's Gateway or relayer).
