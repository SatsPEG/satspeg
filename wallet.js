// ===== SatsPEG Wallet & Mint UI =====

const CITREA_MAINNET = {
  chainId: '0x1012', // 4114 in hex
  chainName: 'Citrea',
  nativeCurrency: { name: 'cBTC', symbol: 'cBTC', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.citrea.xyz'],
  blockExplorerUrls: ['https://explorer.mainnet.citrea.xyz']
};

let connected = false;
let userAddress = null;
let mintQty = 1;
const MIN_QTY = 1;
const MAX_QTY = 10;

// ===== WALLET CONNECTION =====
async function connectWallet() {
  if (!window.ethereum) {
    alert('No wallet detected. Please install MetaMask or another Web3 wallet.');
    return;
  }

  try {
    // Request accounts
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];

    // Switch to Citrea Mainnet
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CITREA_MAINNET.chainId }]
      });
    } catch (switchErr) {
      // Chain not added yet — add it
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CITREA_MAINNET]
        });
      } else {
        throw switchErr;
      }
    }

    connected = true;
    updateUI();
  } catch (err) {
    console.error('Wallet connection failed:', err);
    if (err.code === 4001) {
      // User rejected
    } else {
      alert('Failed to connect wallet. Please try again.');
    }
  }
}

function disconnectWallet() {
  connected = false;
  userAddress = null;
  updateUI();
}

function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// ===== QUANTITY CONTROLS =====
function updateQty(delta) {
  mintQty = Math.max(MIN_QTY, Math.min(MAX_QTY, mintQty + delta));
  document.getElementById('qtyDisplay').textContent = mintQty;
}

// ===== UI UPDATE =====
function updateUI() {
  const connectBtn = document.getElementById('connectWallet');
  const headerBtn = document.getElementById('connectWalletHeader');
  const mintBtn = document.getElementById('mintBtn');

  if (connected && userAddress) {
    // Update connect buttons to show address
    connectBtn.innerHTML = '<span class="wallet-icon">&#9670;</span> ' + shortAddr(userAddress);
    connectBtn.classList.add('connected');
    headerBtn.textContent = shortAddr(userAddress);
    headerBtn.classList.add('connected');

    // Mint button — connected but not live
    mintBtn.textContent = 'MINT — NOT LIVE';
    mintBtn.disabled = true;
  } else {
    connectBtn.innerHTML = '<span class="wallet-icon">&#9670;</span> CONNECT WALLET';
    connectBtn.classList.remove('connected');
    headerBtn.textContent = 'CONNECT';
    headerBtn.classList.remove('connected');
    mintBtn.textContent = 'MINT — NOT LIVE';
    mintBtn.disabled = true;
  }
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  // Connect wallet buttons
  document.getElementById('connectWallet').addEventListener('click', () => {
    if (connected) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  });

  document.getElementById('connectWalletHeader').addEventListener('click', () => {
    if (connected) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  });

  // Quantity buttons
  document.getElementById('qtyMinus').addEventListener('click', () => updateQty(-1));
  document.getElementById('qtyPlus').addEventListener('click', () => updateQty(1));

  // Listen for account/chain changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        userAddress = accounts[0];
        updateUI();
      }
    });

    window.ethereum.on('chainChanged', () => {
      // Reload to reset state on chain change
      window.location.reload();
    });
  }
});
