import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { sepolia } from '@reown/appkit/networks';

// Get Project ID from environment variable
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_REOWN_PROJECT_ID is not set in the environment variables');
}

// Set up the Ethers Adapter
const ethersAdapter = new EthersAdapter();

// Set up metadata
const metadata = {
  name: 'VELUM Protocol',
  description: 'Confidential ERC-20 Infrastructure via fhEVM',
  url: window.location.origin, // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create the modal
export const appKit = createAppKit({
  adapters: [ethersAdapter],
  networks: [sepolia],
  defaultNetwork: sepolia,
  metadata,
  projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-font-family': 'monospace',
    '--w3m-accent': '#eab308', // Terminal yellow
    '--w3m-color-mix': '#000000',
    '--w3m-color-mix-strength': 40,
    '--w3m-border-radius-master': '0px',
  },
  features: {
    analytics: false, // Optional - defaults to your Cloud configuration
  }
});
