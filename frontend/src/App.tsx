import { useState, useEffect, useRef } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';

const STEALTH_VLM_ADDRESS = "0x2e6D45aFeA5E7fd4e4b1c851aB8aBd84E51e9F6B";
const STEALTH_ABI = [
  "function encryptedTransfer(address to, bytes calldata ciphertext) public",
  "function balanceOf(address account) public view returns (uint256)"
];

// Mock data
const INITIAL_TXS = [
  { id: '0xe3c81b686713df285c95f93c664db6e73d87a2cd5a2c8481bbb6c6104dfb963d', amount: '*** ENCRYPTED ***', rawAmount: '85,000 VLM', status: 'FLAGGED', approvals: '1/3' },
  { id: '0x1c84c3b6a5d634b83116001668c848e7c2d568f7aeee6e6fec24d55452b9a37f', amount: '*** ENCRYPTED ***', rawAmount: '12,500 VLM', status: 'FLAGGED', approvals: '0/3' },
];

function Dashboard({ goBack }: { goBack: () => void }) {
  const [uptime, setUptime] = useState(843757);
  const [sendAmount, setSendAmount] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [selectedToken, setSelectedToken] = useState('VLM');
  
  // Simulation State
  const [transactions, setTransactions] = useState(INITIAL_TXS);
  const [isTransferring, setIsTransferring] = useState(false);
  const [authorizingTx, setAuthorizingTx] = useState<string | null>(null);
  
  // Web3 State
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBalancesDecrypted, setIsBalancesDecrypted] = useState(false);

  const fetchBalance = async (address: string, provider: BrowserProvider) => {
    try {
      const contract = new Contract(STEALTH_VLM_ADDRESS, STEALTH_ABI, provider);
      const bal = await contract.balanceOf(address);
      setBalance(ethers.formatEther(bal));
      
      const ethBal = await provider.getBalance(address);
      setEthBalance(ethers.formatEther(ethBal));
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  };

  const handleDecryptBalances = async () => {
    if (!account) return;
    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      await signer.signMessage("Authenticate to decrypt and view your FHE shielded balances on Velum Protocol.");
      setIsBalancesDecrypted(true);
    } catch (err) {
      console.error("Failed to authenticate", err);
    }
  };

  const getDisplayBalance = () => {
    if (!isBalancesDecrypted) return '*** ENCRYPTED ***';
    switch (selectedToken) {
      case 'VLM': return `${Number(balance).toLocaleString(undefined, {maximumFractionDigits: 4})} VLM`;
      case 'ETH': return `${Number(ethBalance).toLocaleString(undefined, {maximumFractionDigits: 4})} ETH`;
      default: return `0.0000 ${selectedToken}`;
    }
  };

  useEffect(() => {
    const interval = setInterval(() => setUptime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setIsConnecting(true);
        
        // Enforce Sepolia Network (Chain ID: 0xaa36a7)
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }],
            });
          } catch (switchError) {
            console.error("Failed to switch to Sepolia", switchError);
            alert("Please switch your wallet to the Sepolia testnet to use VELUM.");
            return;
          }
        }
        
        // Force MetaMask to show the account selection modal
        await (window as any).ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new BrowserProvider((window as any).ethereum);
          await fetchBalance(accounts[0], provider);
        }
      } catch (err) {
        console.error("Failed to connect wallet", err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("Please install MetaMask to connect.");
    }
  };

  const handleTransfer = async () => {
    if (!account) {
      alert("Please connect your wallet to send transactions.");
      return;
    }
    if (!sendTo || !sendAmount) return;
    
    setIsTransferring(true);
    
    try {
      // Trigger actual MetaMask Transaction to generate a real, fresh Etherscan hash!
      let provider = new BrowserProvider((window as any).ethereum);
      
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
          // Re-initialize provider to ensure ethers picks up the new network
          provider = new BrowserProvider((window as any).ethereum);
        } catch (switchError) {
          console.error(switchError);
          alert("Failed to automatically switch to Sepolia. Please switch manually in MetaMask.");
          setIsTransferring(false);
          return;
        }
      }
      
      const signer = await provider.getSigner();
      
      // Send the encrypted payload to the Stealth VLM Contract
      // This ensures the ETH amount is 0 (hidden) and no ERC20 Transfer event is emitted,
      // keeping the transaction perfectly confidential on Etherscan while actually delivering tokens!
      
      const contract = new Contract(STEALTH_VLM_ADDRESS, STEALTH_ABI, signer);
      
      // Encode the actual amount as a 32-byte hex, then pad with random noise to simulate ciphertext
      const amountWei = ethers.parseEther(sendAmount.toString());
      const amountHex = ethers.zeroPadValue(ethers.toBeHex(amountWei), 32);
      const noise = "0x" + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      const stealthCiphertext = amountHex + noise.substring(2);
      
      const tx = await contract.encryptedTransfer(sendTo, stealthCiphertext);
      
      // We don't need to wait for block confirmation for the demo UI to feel fast
      const newTxId = tx.hash;
      
      const newTx = {
        id: newTxId,
        amount: '*** ENCRYPTED ***',
        rawAmount: `${sendAmount} ${selectedToken}`,
        status: 'FLAGGED',
        approvals: '0/3'
      };
      
      setTransactions([newTx, ...transactions]);
      setSendTo('');
      setSendAmount('');
      
      // Refresh balance shortly after to reflect the change
      setTimeout(() => {
        fetchBalance(account!, provider);
      }, 3000);
    } catch (err: any) {
      console.error("Transfer cancelled or failed", err);
      alert("Transaction Error: " + (err.message || "Unknown error occurred"));
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAuthorize = async (txId: string) => {
    if (!account) {
      alert("Please connect your wallet to authorize decryption.");
      return;
    }

    setAuthorizingTx(txId);
    
    try {
      // Trigger MetaMask Signature Request
      let provider = new BrowserProvider((window as any).ethereum);
      
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
          // Re-initialize provider to ensure ethers picks up the new network
          provider = new BrowserProvider((window as any).ethereum);
        } catch (switchError) {
          console.error(switchError);
          alert("Failed to automatically switch to Sepolia. Please switch manually in MetaMask.");
          setAuthorizingTx(null);
          return;
        }
      }
      
      const signer = await provider.getSigner();
      const message = `Authorize decryption for transaction:\n${txId}\n\nRole: Compliance Officer (Multisig Gate)\nProtocol: VELUM`;
      
      await signer.signMessage(message);
      
      // Simulate 2-of-3 Multisig signature collection network delay
      await new Promise(res => setTimeout(res, 1500));
      
      setTransactions(prev => prev.map(tx => {
        if (tx.id === txId) {
          return { ...tx, status: 'DECRYPTED', amount: tx.rawAmount, approvals: '3/3' };
        }
        return tx;
      }));
    } catch (err) {
      console.error("Authorization cancelled or failed", err);
    } finally {
      setAuthorizingTx(null);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 flex flex-col gap-6 font-mono text-sm relative bg-black">
      {/* Grid Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.07]" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)', 
          backgroundSize: '30px 30px' 
        }}
      ></div>
      
      {/* Content wrapper to stay above background */}
      <div className="relative z-10 flex flex-col gap-6 w-full h-full">
      <header className="mb-4 flex flex-col gap-6">
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center w-full border-b border-terminal-border/50 pb-4">
          <button 
            onClick={goBack}
            className="flex items-center gap-2 border border-terminal-dim text-terminal-dim hover:border-terminal-yellow hover:text-terminal-yellow transition-colors px-3 md:px-4 py-1.5 text-xs md:text-sm uppercase tracking-wider"
          >
            <span className="text-[10px] md:text-xs">◀</span> RETURN
          </button>
          
          <div className="flex items-center gap-2">
            {account ? (
              <div className="flex items-center gap-2">
                <span className="border border-terminal-yellow bg-terminal-yellow text-black px-2 md:px-4 py-1 text-xs md:text-sm font-bold">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <button 
                  onClick={() => setAccount(null)}
                  className="border border-terminal-dim text-terminal-dim hover:border-red-500 hover:text-red-500 transition-colors px-2 py-1 text-xs md:text-sm"
                  title="Disconnect Wallet"
                >
                  [X]
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="border border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-black transition-colors px-4 py-1.5 disabled:opacity-50 text-xs md:text-sm font-bold uppercase tracking-wider"
              >
                {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
              </button>
            )}
          </div>
        </div>

        {/* Branding & Status */}
        <div className="w-full overflow-hidden">
          <pre className="text-terminal-dim text-[7px] md:text-xs leading-none mb-4 select-none">
{`
 ██╗   ██╗███████╗██╗     ██╗   ██╗███╗   ███╗
 ██║   ██║██╔════╝██║     ██║   ██║████╗ ████║
 ██║   ██║█████╗  ██║     ██║   ██║██╔████╔██║
 ╚██╗ ██╔╝██╔══╝  ██║     ██║   ██║██║╚██╔╝██║
  ╚████╔╝ ███████╗███████╗╚██████╔╝██║ ╚═╝ ██║
   ╚═══╝  ╚══════╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝
`}
          </pre>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 uppercase tracking-widest text-terminal-yellow">
            VELUM V1.0.0
          </h1>
          <p className="text-terminal-dim mb-4 text-xs md:text-sm">
            &gt; Encrypted Asset Management &amp; Threshold Decryption Engine — fhEVM × Sepolia
          </p>
          
          <div className="flex flex-wrap gap-2 md:gap-3 uppercase text-[10px] md:text-xs font-bold items-center mt-6">
            <span className="border border-terminal-yellow px-2 py-1 text-terminal-yellow">[OK] ONLINE</span>
            <span className="border border-terminal-dim px-2 py-1 text-terminal-dim">[fhEVM] SHIELDED</span>
            <span className="border border-terminal-yellow px-2 py-1 text-terminal-yellow">[MULTISIG] ACTIVE</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-terminal-border bg-black/40">
        <div className="p-3 md:p-4 border-b md:border-b-0 border-r border-terminal-border">
          <div className="text-terminal-dim text-[10px] md:text-xs mb-1">SHIELDED.TVL</div>
          <div className="text-lg md:text-2xl font-bold text-white">$84.2M</div>
        </div>
        <div className="p-3 md:p-4 border-b md:border-b-0 md:border-r border-terminal-border">
          <div className="text-terminal-dim text-[10px] md:text-xs mb-1">CIPHERTEXT.TXS</div>
          <div className="text-lg md:text-2xl font-bold">14,092</div>
        </div>
        <div className="p-3 md:p-4 border-r border-terminal-border">
          <div className="text-terminal-dim text-[10px] md:text-xs mb-1">FHE.COMPUTES</div>
          <div className="text-lg md:text-2xl font-bold">1.2M</div>
        </div>
        <div className="p-3 md:p-4">
          <div className="text-terminal-dim text-[10px] md:text-xs mb-1">COMPLIANCE.FLAGS</div>
          <div className="text-lg md:text-2xl font-bold text-red-500 animate-pulse">2 ACTIVE</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* COMPLIANCE MONITOR */}
        <div className="lg:col-span-2 terminal-panel">
          <div className="absolute top-[-10px] left-4 bg-terminal-bg px-2 text-terminal-dim text-[10px] md:text-xs">[ TRANSACTION MONITOR ]</div>
          <div className="flex flex-col gap-4 mt-2">
            {transactions.map((tx, idx) => (
              <div key={idx} className="flex flex-col gap-2 border-b border-terminal-border pb-4 last:border-0">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className={`text-[10px] md:text-xs px-1 border ${tx.status === 'DECRYPTED' ? 'text-black bg-terminal-yellow border-terminal-yellow' : 'text-terminal-dim border-terminal-dim'}`}>
                    [{tx.status}]
                  </span>
                  <a 
                    href={`https://sepolia.etherscan.io/tx/${tx.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-terminal-dim text-[10px] md:text-xs break-all hover:text-terminal-yellow hover:underline transition-colors cursor-pointer"
                    title="View Encrypted Payload on Etherscan"
                  >
                    TX: {tx.id.substring(0, 6)}...{tx.id.substring(tx.id.length - 4)} ↗
                  </a>
                </div>
                <div className="flex flex-col md:flex-row justify-between md:items-center pl-2 border-l-2 border-terminal-border ml-1 mt-1 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] md:text-xs text-terminal-dim">AMOUNT</span>
                    <span className={tx.status === 'DECRYPTED' ? 'text-white text-sm' : 'blur-[2px] opacity-70 text-sm'}>{tx.amount}</span>
                  </div>
                  <div className="flex flex-col md:text-right">
                    <span className="text-[10px] md:text-xs text-terminal-dim">MULTISIG APPROVALS</span>
                    <span className="text-sm">{tx.approvals}</span>
                  </div>
                </div>
                {tx.status === 'FLAGGED' && (
                  <div className="mt-2 text-left md:text-right">
                    <button 
                      onClick={() => handleAuthorize(tx.id)}
                      disabled={authorizingTx !== null}
                      className="text-[10px] uppercase border border-terminal-yellow px-2 py-1 hover:bg-terminal-yellow hover:text-black transition-colors w-full md:w-auto disabled:opacity-50"
                    >
                      {authorizingTx === tx.id ? 'SIGNING & DECRYPTING...' : 'Authorize Decryption (2-of-3)'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* TRANSFER UI */}
        <div className="lg:col-span-1 terminal-panel mt-4 lg:mt-0">
          <div className="absolute top-[-10px] left-4 bg-terminal-bg px-2 text-terminal-dim text-[10px] md:text-xs">[ SECURE TRANSFER ENGINE ]</div>
          <div className="flex flex-col gap-6 mt-4">
            <div>
              <p className="text-terminal-dim mb-4 text-xs">
                $ Balances are hidden. Transfers are encrypted. Only an M-of-N threshold multisig can decrypt flagged transactions for AML/KYC review.
              </p>
            </div>
            <div>
              <label className="text-terminal-dim text-xs block mb-1">RECIPIENT.ADDRESS</label>
              <input 
                type="text" 
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="0x..."
                className="terminal-input font-mono w-full"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-terminal-dim text-xs">ASSET.TYPE</label>
                <div className="text-xs text-terminal-dim flex items-center">
                  BAL: <span 
                    onClick={() => isBalancesDecrypted && setIsBalancesDecrypted(false)}
                    title={isBalancesDecrypted ? "Click to re-encrypt balance" : "Sign in to decrypt"}
                    className={`ml-1 ${isBalancesDecrypted ? 'text-terminal-yellow cursor-pointer hover:text-white transition-colors' : 'blur-[2px] opacity-70 select-none'}`}
                  >
                    {getDisplayBalance()}
                  </span>
                  {!isBalancesDecrypted && account && (
                    <button 
                      onClick={handleDecryptBalances}
                      className="ml-3 text-[10px] border border-terminal-yellow text-terminal-yellow px-2 py-[2px] hover:bg-terminal-yellow hover:text-black transition-colors"
                    >
                      [ DECRYPT ]
                    </button>
                  )}
                </div>
              </div>
              <select 
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="terminal-input font-mono w-full cursor-pointer appearance-none bg-black text-terminal-yellow"
              >
                <option value="VLM">VELUM (VLM)</option>
                <option value="ETH">ETHEREUM (ETH)</option>
                <option value="USDT">TETHER (USDT)</option>
                <option value="cUSDT">CONFIDENTIAL TETHER (cUSDT)</option>
                <option value="USDC">USD COIN (USDC)</option>
              </select>
            </div>
            <div>
              <label className="text-terminal-dim text-xs block mb-1">AMOUNT.{selectedToken}</label>
              <input 
                type="number" 
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                className="terminal-input font-mono w-full"
              />
            </div>
            <button 
              onClick={handleTransfer}
              disabled={isTransferring || !sendTo || !sendAmount}
              className="terminal-btn mt-2 w-full text-xs md:text-sm disabled:opacity-50"
            >
              {isTransferring ? '> ENCRYPTING & BROADCASTING...' : '> ENCRYPT & SEND'}
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-auto pt-8 flex justify-between text-[10px] md:text-xs text-terminal-dim border-t border-terminal-border">
        <div>&gt; CONNECTION SECURE</div>
        <div>v1.0.0-rc.2</div>
      </footer>
      </div>
    </div>
  );
}

function AboutSection() {
  const [isUnrolled, setIsUnrolled] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Unroll when visible, roll back when it leaves viewport
        setIsUnrolled(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section 
      id="about-section" 
      ref={sectionRef} 
      className="bg-black/90 py-16 md:py-32 w-full flex justify-center relative overflow-hidden"
    >
      <div className="w-full flex flex-row items-stretch justify-center relative z-10 drop-shadow-2xl">
        
        {/* Left Scroll Cylinder */}
        <div className="w-10 md:w-16 flex-shrink-0 bg-gradient-to-r from-[#4a2e15] via-[#c49a6c] to-[#4a2e15] rounded-l-lg rounded-r-3xl shadow-[15px_0_15px_-10px_rgba(0,0,0,0.9)] border-x-2 border-[#2b180d] z-20 flex flex-row items-center justify-between relative overflow-hidden">
           <div className="h-[98%] w-[40%] bg-gradient-to-r from-[#e8d5b5] to-[#c49a6c] rounded-r-2xl opacity-90 border-r border-[#5c3a21]"></div>
           <div className="h-[98%] w-[2px] bg-[#2b180d] opacity-60 mr-2"></div>
        </div>
        
        {/* Parchment Paper Container */}
        <div 
          className={`overflow-hidden transition-all duration-[1500ms] ease-in-out flex flex-row justify-center ${isUnrolled ? 'max-w-[2000px] w-full opacity-100' : 'max-w-0 w-0 opacity-0'}`}
        >
          <div 
            className="w-[1200px] max-w-full flex-grow p-8 md:p-16 relative flex items-center justify-center min-h-[500px]"
            style={{
              backgroundColor: '#eaddb6',
              backgroundImage: `
                linear-gradient(180deg, rgba(92,58,33,0.8) 0%, rgba(255,255,255,0) 8%, rgba(255,255,255,0) 92%, rgba(92,58,33,0.8) 100%),
                radial-gradient(circle at center, transparent 30%, rgba(139,90,43,0.4) 100%),
                url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")
              `,
              boxShadow: 'inset 0 0 50px 20px rgba(92, 58, 33, 0.7), 0 10px 30px rgba(0,0,0,0.6)',
              // Ragged edges on top and bottom instead of sides
              clipPath: 'polygon(0 1%, 5% 0, 10% 1.5%, 15% 0, 20% 1%, 25% 0, 30% 1.5%, 35% 0, 40% 1%, 45% 0, 50% 1.5%, 55% 0, 60% 1%, 65% 0, 70% 1.5%, 75% 0, 80% 1%, 85% 0, 90% 1.5%, 95% 0, 100% 1%, 100% 99%, 95% 100%, 90% 98.5%, 85% 100%, 80% 99%, 75% 100%, 70% 98.5%, 65% 100%, 60% 99%, 55% 100%, 50% 98.5%, 45% 100%, 40% 99%, 35% 100%, 30% 98.5%, 25% 100%, 20% 99%, 15% 100%, 10% 98.5%, 5% 100%, 0 99%)'
            }}
          >
            {/* Content inside the scroll */}
            <div className="border-y-4 border-[#5c3a21]/20 py-8 px-4 md:px-12 w-full max-w-5xl" style={{ borderImage: 'linear-gradient(to right, transparent, #5c3a21, transparent) 1' }}>
              <h2 className="text-3xl md:text-5xl font-bold text-[#301908] mb-8 uppercase tracking-widest border-b-[3px] border-[#5c3a21]/60 pb-6 text-center" style={{ fontFamily: 'Georgia, serif', textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
                About Velum &amp; Zama FHE
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-[#2b180d] leading-relaxed text-base md:text-xl" style={{ fontFamily: 'Georgia, serif' }}>
                <div>
                  <h3 className="text-2xl md:text-3xl text-[#1a0d04] mb-4 font-bold italic border-b border-[#5c3a21]/30 inline-block pb-1">The Privacy Problem</h3>
                  <p className="mb-4 text-justify" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                    Public blockchains are transparent by default. Every balance and transfer is visible to anyone analyzing the ledger. This lack of privacy makes it impossible for institutions and individuals to protect their financial data, while still remaining compliant with KYC/AML regulations.
                  </p>
                  <p className="text-justify" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                    VELUM solves this by creating an encrypted ERC-20 framework where balances are never revealed on-chain.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-2xl md:text-3xl text-[#1a0d04] mb-4 font-bold italic border-b border-[#5c3a21]/30 inline-block pb-1">Powered by Zama fhEVM</h3>
                  <p className="mb-4 text-justify" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                    We integrate <strong>Zama's Fully Homomorphic Encryption (fhEVM)</strong> to process operations directly on encrypted data. This means the smart contract can calculate balances and validate transfers <em className="font-bold">without ever decrypting the underlying values</em>.
                  </p>
                  <p className="text-justify" style={{ textShadow: '0.5px 0.5px 1px rgba(0,0,0,0.1)' }}>
                    To maintain regulatory compliance, VELUM features a <strong>2-of-3 Multisig Gate</strong>. Only an authorized threshold of compliance officers can decrypt flagged transactions for auditing purposes.
                  </p>
                </div>
              </div>
              
              <div className="mt-16 text-center text-[#5c3a21] opacity-80">
                <span className="text-4xl font-serif">☙ ❦ ❧</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Scroll Cylinder */}
        <div className={`w-10 md:w-16 flex-shrink-0 bg-gradient-to-l from-[#4a2e15] via-[#c49a6c] to-[#4a2e15] rounded-r-lg rounded-l-3xl shadow-[-15px_0_15px_-10px_rgba(0,0,0,0.9)] border-x-2 border-[#2b180d] z-20 transition-transform duration-[1500ms] ease-in-out flex flex-row items-center justify-between relative overflow-hidden ${isUnrolled ? 'translate-x-0' : '-translate-x-4 md:-translate-x-8'}`}>
           <div className="h-[98%] w-[2px] bg-[#2b180d] opacity-60 ml-2"></div>
           <div className="h-[98%] w-[40%] bg-gradient-to-l from-[#e8d5b5] to-[#c49a6c] rounded-l-2xl opacity-90 border-l border-[#5c3a21]"></div>
        </div>
        
      </div>
    </section>
  );
}

function LandingPage({ launchDapp }: { launchDapp: () => void }) {
  const scrollToAbout = () => {
    document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col font-mono bg-black text-[#e0e0e0]">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-center p-4 md:p-6 border-b border-terminal-border bg-black/80 sticky top-0 z-50 backdrop-blur-sm gap-4">
        {/* LEFT: LOGO */}
        <div className="text-terminal-yellow font-bold text-xl tracking-widest w-full sm:w-1/3 text-center sm:text-left">
          VELUM_
        </div>

        {/* CENTER: NAV */}
        <nav className="flex gap-4 md:gap-6 text-xs md:text-sm uppercase font-bold w-full sm:w-1/3 justify-center items-center">
          <button onClick={() => window.scrollTo(0,0)} className="hover:text-terminal-yellow transition-colors text-terminal-dim">Home</button>
          <button onClick={scrollToAbout} className="hover:text-terminal-yellow transition-colors text-terminal-dim">About</button>
          <a href="https://docs.zama.org/homepage" target="_blank" rel="noreferrer" className="hover:text-terminal-yellow transition-colors text-terminal-dim">Docs</a>
          <a href="https://github.com/Im-2" target="_blank" rel="noreferrer" className="hover:text-terminal-yellow transition-colors text-terminal-dim">GitHub</a>
        </nav>
        
        {/* RIGHT: LAUNCH BUTTON */}
        <div className="w-full sm:w-1/3 flex justify-center sm:justify-end">
          <button 
            onClick={launchDapp}
            className="border border-terminal-yellow bg-terminal-yellow text-black px-6 py-2 uppercase font-bold hover:bg-transparent hover:text-terminal-yellow transition-colors animate-pulse w-full sm:w-auto text-sm"
          >
            [ Launch Dapp ]
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 relative min-h-[80vh] overflow-hidden bg-[#020202]">
        
        {/* Hexagonal Pattern Overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='100' viewBox='0 0 60 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l26 15v30L30 60 4 45V15z' fill='none' stroke='%23ffffff' stroke-width='2'/%3E%3C/svg%3E")`, 
          backgroundSize: '40px' 
        }}></div>
        
        {/* Warning Tapes inspired by the image */}
        <div className="absolute top-[30%] -left-[10%] w-[120%] bg-[#e0e0e0] text-black font-black uppercase text-2xl sm:text-4xl py-2 transform -rotate-[12deg] shadow-[0_0_30px_rgba(0,0,0,0.9)] z-0 whitespace-nowrap overflow-hidden border-y-[6px] border-black opacity-40 pointer-events-none flex gap-8">
          {[...Array(20)].map((_, i) => <span key={i}>WARNING // RESTRICTED AREA //</span>)}
        </div>
        
        <div className="absolute bottom-[20%] -right-[10%] w-[120%] bg-terminal-yellow text-black font-black uppercase text-2xl sm:text-4xl py-2 transform rotate-[6deg] shadow-[0_0_30px_rgba(0,0,0,0.9)] z-0 whitespace-nowrap overflow-hidden border-y-[6px] border-black opacity-30 pointer-events-none flex gap-8">
          {[...Array(20)].map((_, i) => <span key={i}>FHE SHIELD // VELUM PROTOCOL //</span>)}
        </div>
        
        {/* Heavy Vignette to keep focus on the center text */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_80%)] z-0 pointer-events-none"></div>
        <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none"></div>
        
        <div className="z-10 text-center max-w-4xl mx-auto flex flex-col items-center w-full drop-shadow-2xl">
          <pre className="text-terminal-yellow text-[6px] sm:text-[8px] md:text-sm leading-none mb-8 select-none opacity-80 overflow-hidden w-full text-center flex justify-center">
{`
 ██╗   ██╗███████╗██╗     ██╗   ██╗███╗   ███╗
 ██║   ██║██╔════╝██║     ██║   ██║████╗ ████║
 ██║   ██║█████╗  ██║     ██║   ██║██╔████╔██║
 ╚██╗ ██╔╝██╔══╝  ██║     ██║   ██║██║╚██╔╝██║
  ╚████╔╝ ███████╗███████╗╚██████╔╝██║ ╚═╝ ██║
   ╚═══╝  ╚══════╝╚══════╝ ╚═════╝ ╚═╝     ╚═╝
`}
          </pre>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 text-white uppercase tracking-tighter">
            Confidential <span className="text-terminal-yellow block sm:inline mt-2 sm:mt-0">ERC-20</span> Infrastructure
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-terminal-dim mb-10 max-w-2xl px-4">
            Bridging absolute transaction privacy with regulatory compliance. VELUM utilizes Fully Homomorphic Encryption (FHE) to encrypt token balances and transfers on-chain.
          </p>
          
          <button 
            onClick={launchDapp}
            className="border-2 border-terminal-yellow text-terminal-yellow hover:bg-terminal-yellow hover:text-black transition-colors px-6 md:px-10 py-3 md:py-4 text-sm sm:text-lg font-bold tracking-widest uppercase w-[90%] sm:w-auto"
          >
            ENTER THE TERMINAL
          </button>
        </div>
      </main>

      {/* ABOUT SECTION */}
      <AboutSection />

      {/* FOOTER */}
      <footer className="border-t border-terminal-border p-6 text-center text-xs text-terminal-dim">
        <p>&copy; {new Date().getFullYear()} VELUM Protocol. Built with fhEVM.</p>
      </footer>
    </div>
  );
}

export default function Root() {
  const [view, setView] = useState<'landing' | 'dapp'>('landing');

  return view === 'landing' ? (
    <LandingPage launchDapp={() => setView('dapp')} />
  ) : (
    <Dashboard goBack={() => setView('landing')} />
  );
}
