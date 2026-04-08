// --- Global State ---
const STORAGE_KEYS = { CART: 'mob_cart_v10' };
let products = [];
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Page-specific detection
  if (document.getElementById('productGrid')) {
    loadProducts();
  }
  
  updateCartCount();
  setupFormHandlers();
});

// --- 1. Load Products from Decap CMS JSON ---
async function loadProducts() {
  try {
    const res = await fetch('/data/products.json');
    const data = await res.json();
    products = data.items || [];
    renderProducts();
  } catch (err) {
    console.error("CMS Data Error:", err);
    const grid = document.getElementById('productGrid');
    if(grid) grid.innerHTML = '<p>Loading latest inventory...</p>';
  }
}

// --- 2. Render Products ---
function renderProducts() {
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  grid.innerHTML = '';

  products.forEach(p => {
    const isOOS = p.stock_status === "Out of Stock"; //
    const card = document.createElement('div');
    card.className = 'card product-card';
    
    card.innerHTML = `
      <img src="${p.img || 'https://via.placeholder.com/400x300'}" style="width:100%; border-radius:12px; ${isOOS ? 'filter:grayscale(1); opacity:0.5;' : ''}">
      ${isOOS ? '<span class="badge badge-danger">Sold Out</span>' : ''}
      <h4 style="margin: 15px 0 5px;">${p.name}</h4>
      <p style="color:var(--primary); font-weight:800;">₹${p.price.toFixed(2)} / ${p.unit}</p>
      <button class="btn-primary" onclick="addToCart('${p.id}')" ${isOOS ? 'disabled' : ''}>
        ${isOOS ? 'Currently Unavailable' : 'Add to Cart'}
      </button>
    `;
    grid.appendChild(card);
  });
}

// --- 3. Persistent Cart Logic ---
window.addToCart = function(id) {
  const p = products.find(prod => prod.id === id);
  if(!p || p.stock_status === "Out of Stock") return;

  const existing = cart.find(item => item.id === id);
  if(existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: p.id, name: p.name, price: p.price, unit: p.unit, qty: 1, img: p.img });
  }

  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartCount();
  showToast(`${p.name} added to cart!`);
};

function updateCartCount() {
  const countEl = document.getElementById('cartCount');
  if(countEl) countEl.textContent = cart.length;
}

// --- 4. Netlify Form Submission (AJAX) ---
function setupFormHandlers() {
  const forms = ['rechargeForm', 'uploadForm', 'checkoutForm'];
  
  forms.forEach(formId => {
    const el = document.getElementById(formId);
    if(el) {
      el.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        
        fetch("/", {
          method: "POST",
          body: formData,
        })
        .then(() => {
          showToast("Successfully sent to Mobarok Online!");
          this.reset();
        })
        .catch(() => showToast("Error sending request.", false));
      });
    }
  });
}

// --- 5. UI Helpers ---
function showToast(msg, isSuccess = true) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = isSuccess ? 'var(--success)' : 'var(--danger)';
  toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${msg}`;
  
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}
