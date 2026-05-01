// ===== SatsPEG Multi-Wallet & Mint UI =====

const CITREA_MAINNET = {
  chainId: '0x1012', // 4114
  chainName: 'Citrea',
  nativeCurrency: { name: 'cBTC', symbol: 'cBTC', decimals: 18 },
  rpcUrls: ['https://rpc.mainnet.citrea.xyz'],
  blockExplorerUrls: ['https://explorer.mainnet.citrea.xyz']
};

let connected = false;
let userAddress = null;
let mintQty = 1;
let currentProvider = null;
const MIN_QTY = 1;
const MAX_QTY = 10;

// ===== DETECT EVM WALLETS =====
function getAvailableWallets() {
  const wallets = [];

  // Check window.ethereum providers (EIP-6963 multi-wallet)
  if (window.ethereum) {
    // MetaMask
    if (window.ethereum.isMetaMask) {
      wallets.push({ name: 'MetaMask', provider: window.ethereum, icon: 'M' });
    }
    // Rabby
    if (window.ethereum.isRabby) {
      wallets.push({ name: 'Rabby', provider: window.ethereum, icon: 'R' });
    }
    // Phantom EVM
    if (window.ethereum.isPhantom) {
      wallets.push({ name: 'Phantom', provider: window.ethereum, icon: 'P' });
    }
    // Generic fallback if none matched
    if (wallets.length === 0) {
      wallets.push({ name: 'Browser Wallet', provider: window.ethereum, icon: 'W' });
    }
  }

  // OKX Wallet (separate provider)
  if (window.okxwallet) {
    wallets.push({ name: 'OKX Wallet', provider: window.okxwallet, icon: 'O' });
  }

  // Phantom EVM (separate provider)
  if (window.phantom && window.phantom.ethereum) {
    const hasPhantom = wallets.some(w => w.name === 'Phantom');
    if (!hasPhantom) {
      wallets.push({ name: 'Phantom', provider: window.phantom.ethereum, icon: 'P' });
    }
  }

  // Trust Wallet
  if (window.trustwallet) {
    wallets.push({ name: 'Trust Wallet', provider: window.trustwallet, icon: 'T' });
  }

  // Coinbase Wallet
  if (window.coinbaseWalletExtension) {
    wallets.push({ name: 'Coinbase Wallet', provider: window.coinbaseWalletExtension, icon: 'C' });
  }

  return wallets;
}

// ===== WALLET PICKER MODAL =====
function showWalletPicker(wallets) {
  // Remove old modal if exists
  const old = document.getElementById('walletModal');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'walletModal';
  overlay.className = 'wallet-modal-overlay';

  let html = '<div class="wallet-modal">';
  html += '<h3 class="wallet-modal-title">Connect Wallet</h3>';
  html += '<p class="wallet-modal-sub">Select an EVM wallet for Citrea Mainnet</p>';

  wallets.forEach((w, i) => {
    html += `<button class="wallet-option" data-wallet-idx="${i}">`;
    html += `<span class="wallet-option-icon">${w.icon}</span>`;
    html += `<span>${w.name}</span>`;
    html += '</button>';
  });

  html += '<button class="wallet-modal-close" id="walletModalClose">CANCEL</button>';
  html += '</div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  // Events
  document.getElementById('walletModalClose').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.wallet-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.walletIdx);
      overlay.remove();
      await connectWithProvider(wallets[idx]);
    });
  });
}

// ===== CONNECT WITH SPECIFIC PROVIDER =====
async function connectWithProvider(wallet) {
  const provider = wallet.provider;
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];
    currentProvider = provider;

    // Switch/add Citrea Mainnet
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CITREA_MAINNET.chainId }]
      });
    } catch (switchErr) {
      if (switchErr.code === 4902 || switchErr.code === -32603) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [CITREA_MAINNET]
        });
      } else {
        throw switchErr;
      }
    }

    connected = true;
    updateUI();

    // Listen for changes on this provider
    provider.on('accountsChanged', (accs) => {
      if (accs.length === 0) { disconnectWallet(); }
      else { userAddress = accs[0]; updateUI(); }
    });
    provider.on('chainChanged', () => window.location.reload());

  } catch (err) {
    console.error('Connection failed:', err);
    if (err.code !== 4001) {
      alert('Failed to connect ' + wallet.name + '. Please try again.');
    }
  }
}

// ===== CONNECT FLOW =====
function connectWallet() {
  const wallets = getAvailableWallets();
  if (wallets.length === 0) {
    alert('No EVM wallet detected.\n\nPlease install one of:\n- MetaMask\n- OKX Wallet\n- Rabby\n- Phantom\n- Trust Wallet');
    return;
  }
  if (wallets.length === 1) {
    connectWithProvider(wallets[0]);
  } else {
    showWalletPicker(wallets);
  }
}

function disconnectWallet() {
  connected = false;
  userAddress = null;
  currentProvider = null;
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
    connectBtn.innerHTML = '<span class="wallet-icon">&#9670;</span> ' + shortAddr(userAddress);
    connectBtn.classList.add('connected');
    headerBtn.textContent = shortAddr(userAddress);
    headerBtn.classList.add('connected');
    mintBtn.textContent = 'MINT \u2014 NOT LIVE';
    mintBtn.disabled = true;
  } else {
    connectBtn.innerHTML = '<span class="wallet-icon">&#9670;</span> CONNECT WALLET';
    connectBtn.classList.remove('connected');
    headerBtn.textContent = 'CONNECT';
    headerBtn.classList.remove('connected');
    mintBtn.textContent = 'MINT \u2014 NOT LIVE';
    mintBtn.disabled = true;
  }
}

// ===== NAV ACTIVE STATE =====
function initNav() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section, #home');

  function setActive() {
    let current = '';
    sections.forEach(s => {
      const top = s.offsetTop - 100;
      if (window.scrollY >= top) current = s.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', setActive);
  setActive();
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('connectWallet').addEventListener('click', () => {
    connected ? disconnectWallet() : connectWallet();
  });
  document.getElementById('connectWalletHeader').addEventListener('click', () => {
    connected ? disconnectWallet() : connectWallet();
  });
  document.getElementById('qtyMinus').addEventListener('click', () => updateQty(-1));
  document.getElementById('qtyPlus').addEventListener('click', () => updateQty(1));
  initNav();
});
