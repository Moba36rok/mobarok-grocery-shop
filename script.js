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
  setupModalHandlers();
});

// --- 1. Load Products from Decap CMS JSON ---
async function loadProducts() {
  try {
    // If you are opening without a server, force the error to trigger the fallback data
    if (window.location.protocol === 'file:') {
      throw new Error("Cannot fetch JSON directly from file:// protocol. Using fallback data.");
    }

    const res = await fetch('./data/products.json'); // Changed to relative path
    
    // If the file doesn't exist yet (404 error), trigger the fallback data
    if (!res.ok) {
      throw new Error("products.json not found. Have you created it in the CMS yet?");
    }

    const data = await res.json();
    products = data.items || [];
    renderProducts();
    
  } catch (err) {
    console.warn(err.message);
    
    // Fallback Dummy Data so you can ALWAYS see your design
    products = [
      { id: "1", name: "Premium Basmati Rice", price: 85, unit: "kg", stock_status: "In Stock", img: "" },
      { id: "2", name: "Mustard Oil", price: 140, unit: "liter", stock_status: "In Stock", img: "" },
      { id: "3", name: "Aashirvaad Atta", price: 55, unit: "kg", stock_status: "In Stock", img: "" },
      { id: "4", name: "Tata Salt", price: 25, unit: "kg", stock_status: "In Stock", img: "" }
    ];
    renderProducts();
  }
}
 

// --- 2. Render Products ---
function renderProducts() {
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  grid.innerHTML = '';

  products.forEach(p => {
    const isOOS = p.stock_status === "Out of Stock";
    const card = document.createElement('div');
    card.className = 'card product-card';
    
    // Check if image exists, otherwise use a stylish neon placeholder
    const imageContent = p.img 
      ? `<img src="${p.img}" style="width:100%; border-radius:12px; height:200px; object-fit:cover; margin-bottom:15px; ${isOOS ? 'filter:grayscale(1); opacity:0.5;' : ''}">`
      : `<div style="height: 150px; background: rgba(255,255,255,0.05); border-radius: 8px; display:flex; align-items:center; justify-content:center; margin-bottom: 15px;">
          <span style="font-size: 40px;">🛒</span>
         </div>`;

    card.innerHTML = `
      ${imageContent}
      ${isOOS ? '<span style="color: var(--danger); font-size: 12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; text-shadow: 0 0 5px var(--danger);">Sold Out</span>' : ''}
      <h4 style="margin: 5px 0;">${p.name}</h4>
      <p style="color:var(--primary); font-weight:800; margin-bottom: 15px; text-shadow: 0 0 5px rgba(0,229,255,0.3);">₹${p.price.toFixed(2)} / ${p.unit}</p>
      <button class="btn-primary" onclick="addToCart('${p.id}')" ${isOOS ? 'disabled' : ''}>
        ${isOOS ? 'Unavailable' : 'Add to Cart'}
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
    cart.push({ id: p.id, name: p.name, price: p.price, unit: p.unit, qty: 1 });
  }

  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartCount();
  showToast(`${p.name} added to cart!`);
};

function updateCartCount() {
  const countEls = document.querySelectorAll('#cartCount');
  countEls.forEach(el => el.textContent = cart.length);
}

// --- 4. Modal & UI Helpers ---
function setupModalHandlers() {
  const modal = document.getElementById('cartModal');
  const openBtns = document.querySelectorAll('#openCartBtn');
  const closeBtns = document.querySelectorAll('.close');

  openBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if(modal) {
        modal.classList.add('active');
        renderCartItems();
      }
    });
  });

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if(modal) modal.classList.remove('active');
    });
  });
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  if(!container) return;
  
  if(cart.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Your cart is empty.</p>';
    return;
  }

  let total = 0;
  container.innerHTML = cart.map(item => {
    total += (item.price * item.qty);
    return `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong><br>
          <small style="color: var(--text-muted);">₹${item.price} x ${item.qty} ${item.unit}</small>
        </div>
        <strong style="color: white;">₹${item.price * item.qty}</strong>
      </div>
    `;
  }).join('');
  
  container.innerHTML += `
    <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
    <div style="display:flex; justify-content:space-between; font-size: 1.2em; margin-bottom: 20px;">
      <strong>Total:</strong>
      <strong style="color: var(--primary); text-shadow: 0 0 10px rgba(0, 229, 255, 0.4);">₹${total.toFixed(2)}</strong>
    </div>
    <button class="btn-success" onclick="checkoutWhatsApp()" style="margin-bottom: 10px; box-shadow: 0 0 15px rgba(57, 255, 20, 0.2);">📲 Send Order to WhatsApp</button>
    <button onclick="clearCart()" style="background: transparent; border: 1px solid var(--danger); color: var(--danger); padding: 10px; width: 100%; border-radius: 50px; cursor: pointer; transition: 0.3s;">🗑️ Clear Cart</button>
  `;
}

// --- 5. Real WhatsApp Checkout Logic ---
window.checkoutWhatsApp = function() {
  if(cart.length === 0) {
    showToast("Your cart is empty!", false);
    return;
  }

  // Build the message
  let message = "🛒 *New Grocery Order from Mobarok Online*\n\n";
  let total = 0;

  cart.forEach((item, index) => {
    let itemTotal = item.price * item.qty;
    total += itemTotal;
    message += `${index + 1}. *${item.name}*\n`;
    message += `   ${item.qty} ${item.unit} x ₹${item.price} = ₹${itemTotal}\n`;
  });

  message += `\n*Total Amount: ₹${total.toFixed(2)}*\n\n`;
  message += "Please confirm my order and share delivery details.";

  // Encode the text so it works in a web link
  const encodedMessage = encodeURIComponent(message);
  
  // WhatsApp Number
  const phoneNumber = "918918636763"; 
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  // Open WhatsApp in a new tab/app
  window.open(whatsappURL, '_blank');
};

// --- 6. Clear Cart Logic ---
window.clearCart = function() {
  cart = [];
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartCount();
  renderCartItems();
  showToast("Cart cleared successfully.");
};

// --- 7. Netlify Form Submission (AJAX) ---
function setupFormHandlers() {
  const forms = ['rechargeForm', 'uploadForm'];
  
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

// --- 8. Toast Notifications ---
function showToast(msg, isSuccess = true) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = isSuccess ? 'var(--success)' : 'var(--danger)';
  toast.style.boxShadow = isSuccess ? '0 0 15px rgba(57, 255, 20, 0.3)' : '0 0 15px rgba(255, 0, 85, 0.3)';
  toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${msg}`;
  
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}
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
