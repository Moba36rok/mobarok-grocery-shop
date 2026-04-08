// --- Global State ---
const STORAGE_KEYS = { CART: 'mob_cart_v10' };
let products = [];
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('productGrid')) {
    loadProducts();
  }
  updateCartCount();
  setupFormHandlers();
  setupModalHandlers();
});

// --- 1. Load Products (With Failsafe) ---
async function loadProducts() {
  try {
    const res = await fetch('./data/products.json');
    if (!res.ok) throw new Error("JSON not found.");
    
    const data = await res.json();
    if (!data || !data.items || data.items.length === 0) {
      throw new Error("Product list empty.");
    }

    products = data.items;
    renderProducts();
  } catch (err) {
    console.warn("Using fallback data due to:", err.message);
    products = [
      { id: "1", name: "Premium Basmati Rice", price: 85, unit: "kg", stock_status: "In Stock", img: "" },
      { id: "2", name: "Fortune Mustard Oil", price: 140, unit: "liter", stock_status: "In Stock", img: "" },
      { id: "3", name: "Aashirvaad Atta", price: 55, unit: "kg", stock_status: "In Stock", img: "" }
    ];
    renderProducts();
  }
}

// --- 2. Render Products to Screen ---
function renderProducts() {
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  grid.innerHTML = '';

  products.forEach(p => {
    const isOOS = p.stock_status === "Out of Stock";
    const card = document.createElement('div');
    card.className = 'card product-card';
    
    const imageContent = p.img 
      ? `<img src="${p.img}" style="width:100%; border-radius:12px; height:200px; object-fit:cover; margin-bottom:15px; ${isOOS ? 'filter:grayscale(1); opacity:0.5;' : ''}">`
      : `<div style="height: 150px; background: rgba(255,255,255,0.05); border-radius: 8px; display:flex; align-items:center; justify-content:center; margin-bottom: 15px;"><span style="font-size: 40px;">🛒</span></div>`;

    card.innerHTML = `
      ${imageContent}
      ${isOOS ? '<span style="color: var(--danger); font-size: 12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Sold Out</span>' : ''}
      <h4 style="margin: 5px 0;">${p.name}</h4>
      <p style="color:var(--primary); font-weight:800; margin-bottom: 15px;">₹${p.price.toFixed(2)} / ${p.unit}</p>
      <button class="btn-primary" onclick="addToCart('${p.id}')" ${isOOS ? 'disabled' : ''}>
        ${isOOS ? 'Unavailable' : 'Add to Cart'}
      </button>
    `;
    grid.appendChild(card);
  });
}

// --- 3. Cart Logic ---
window.addToCart = function(id) {
  const p = products.find(prod => prod.id === id);
  if(!p || p.stock_status === "Out of Stock") return;

  const existing = cart.find(item => item.id === id);
  if(existing) existing.qty += 1;
  else cart.push({ id: p.id, name: p.name, price: p.price, unit: p.unit, qty: 1 });

  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartCount();
  showToast(`${p.name} added to cart!`);
};

function updateCartCount() {
  const countEls = document.querySelectorAll('#cartCount');
  countEls.forEach(el => el.textContent = cart.length);
}

// --- 4. Modal & UI Checkout Form ---
function setupModalHandlers() {
  const modal = document.getElementById('cartModal');
  const openBtns = document.querySelectorAll('#openCartBtn');
  const closeBtns = document.querySelectorAll('.close');

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    if(modal) { modal.classList.add('active'); renderCartItems(); }
  }));
  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    if(modal) modal.classList.remove('active');
  }));
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  if(!container) return;
  
  if(cart.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Your cart is empty.</p>';
    return;
  }

  let total = 0;
  let itemsHTML = cart.map(item => {
    total += (item.price * item.qty);
    return `
      <div class="cart-item">
        <div><strong>${item.name}</strong><br><small style="color: var(--text-muted);">₹${item.price} x ${item.qty} ${item.unit}</small></div>
        <strong style="color: white;">₹${item.price * item.qty}</strong>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    ${itemsHTML}
    <div style="display:flex; justify-content:space-between; font-size: 1.2em; margin: 15px 0;">
      <strong>Total:</strong><strong style="color: var(--primary);">₹${total.toFixed(2)}</strong>
    </div>
    
    <form id="checkoutForm" onsubmit="processOrder(event)" style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
      <input type="text" id="cust_name" placeholder="Your Full Name" required style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
      <input type="tel" id="cust_phone" placeholder="10-digit Mobile Number" required pattern="[0-9]{10}" style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
      <textarea id="cust_address" placeholder="Full Delivery Address" required rows="2" style="width: 100%; padding: 12px; background: rgba(0,0,0,0.5); color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;"></textarea>

      <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 10px; cursor: pointer;"><input type="radio" name="pay_method" value="UPI" checked> 📱 UPI Payment (Pay Now)</label>
        <label style="display: block; cursor: pointer;"><input type="radio" name="pay_method" value="COD"> 💵 Cash on Delivery</label>
      </div>

      <button type="submit" class="btn-success">Place Order (₹${total.toFixed(2)})</button>
      <button type="button" onclick="clearCart()" style="background: transparent; border: none; color: var(--danger); margin-top: 5px; cursor: pointer;">🗑️ Empty Cart</button>
    </form>
  `;
}

// --- 5. Process Order & Open UPI App ---
window.processOrder = function(e) {
  e.preventDefault(); // Stop page from reloading

  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerText = "Processing...";
  btn.disabled = true;

  // Gather Data
  const name = document.getElementById('cust_name').value;
  const phone = document.getElementById('cust_phone').value;
  const address = document.getElementById('cust_address').value;
  const payMethod = document.querySelector('input[name="pay_method"]:checked').value;
  
  let total = 0;
  let summary = "";
  cart.forEach(item => {
    total += (item.price * item.qty);
    summary += `${item.name} (${item.qty} ${item.unit}) - ₹${item.price * item.qty}\n`;
  });

  // Package for Netlify
  const formData = new FormData();
  formData.append("form-name", "New_Orders"); // Must match hidden form
  formData.append("customer_name", name);
  formData.append("phone", phone);
  formData.append("address", address);
  formData.append("payment_method", payMethod);
  formData.append("total_amount", `₹${total.toFixed(2)}`);
  formData.append("order_summary", summary);

  // Send to Netlify Silently
  fetch("/", { method: "POST", body: formData })
    .then(() => {
      showToast("Order Placed Successfully!");
      
      // If UPI, calculate the exact amount and open the app
      if(payMethod === "UPI") {
        const upiLink = `upi://pay?pa=8918636763@yapl&pn=Mobarok%20Online&am=${total.toFixed(2)}&cu=INR`;
        window.location.href = upiLink; // This opens GPay/PhonePe on phones
      }

      clearCart();
      document.getElementById('cartModal').classList.remove('active');
    })
    .catch(() => {
      showToast("Error placing order. Please try again.", false);
      btn.innerText = "Place Order";
      btn.disabled = false;
    });
};

// --- 6. Helpers ---
window.clearCart = function() {
  cart = [];
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartCount(); renderCartItems();
};

function setupFormHandlers() {
  ['rechargeForm', 'uploadForm'].forEach(formId => {
    const el = document.getElementById(formId);
    if(el) {
      el.addEventListener('submit', function(e) {
        e.preventDefault();
        fetch("/", { method: "POST", body: new FormData(this) })
        .then(() => { showToast("Success!"); this.reset(); })
        .catch(() => showToast("Error", false));
      });
    }
  });
}

function showToast(msg, isSuccess = true) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = isSuccess ? 'var(--success)' : 'var(--danger)';
  toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
      { id: "4", name: "Tata Salt", price: 25, unit: "kg", stock_status: "In Stock", img: "" }
    ];
    renderProducts();
  }
}

// --- 2. Render Products to Screen ---
function renderProducts() {
  const grid = document.getElementById('productGrid');
  if(!grid) return;
  grid.innerHTML = '';

  products.forEach(p => {
    const isOOS = p.stock_status === "Out of Stock";
    const card = document.createElement('div');
    card.className = 'card product-card';
    
    const imageContent = p.img 
      ? `<img src="${p.img}" style="width:100%; border-radius:12px; height:200px; object-fit:cover; margin-bottom:15px; ${isOOS ? 'filter:grayscale(1); opacity:0.5;' : ''}">`
      : `<div style="height: 150px; background: rgba(255,255,255,0.05); border-radius: 8px; display:flex; align-items:center; justify-content:center; margin-bottom: 15px;">
          <span style="font-size: 40px;">🛒</span>
         </div>`;

    card.innerHTML = `
      ${imageContent}
      ${isOOS ? '<span style="color: var(--danger); font-size: 12px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Sold Out</span>' : ''}
      <h4 style="margin: 5px 0;">${p.name}</h4>
      <p style="color:var(--primary); font-weight:800; margin-bottom: 15px;">₹${p.price.toFixed(2)} / ${p.unit}</p>
      <button class="btn-primary" onclick="addToCart('${p.id}')" ${isOOS ? 'disabled' : ''}>
        ${isOOS ? 'Unavailable' : 'Add to Cart'}
      </button>
    `;
    grid.appendChild(card);
  });
}

// --- 3. Cart Logic ---
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

// --- 4. Modal & UI ---
function setupModalHandlers() {
  const modal = document.getElementById('cartModal');
  const openBtns = document.querySelectorAll('#openCartBtn');
  const closeBtns = document.querySelectorAll('.close');

  openBtns.forEach(btn => btn.addEventListener('click', () => {
    if(modal) { modal.classList.add('active'); renderCartItems(); }
  }));
  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    if(modal) modal.classList.remove('active');
  }));
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  if(!container) return;
  
  if(cart.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Your cart is empty.</p>';
    return;
  }

  let total = 0;
  let itemsHTML = cart.map(item => {
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
  
  container.innerHTML = `
    ${itemsHTML}
    <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
    <div style="display:flex; justify-content:space-between; font-size: 1.2em; margin-bottom: 20px;">
      <strong>Total:</strong>
      <strong style="color: var(--primary);">₹${total.toFixed(2)}</strong>
    </div>
    
    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
      <p style="margin-top: 0; color: var(--text-muted); font-weight: bold;">Select Payment Method:</p>
      <label style="display: block; margin-bottom: 10px; cursor: pointer;">
        <input type="radio" name="payment_method" value="UPI Payment" checked> 📱 UPI Payment
      </label>
      <label style="display: block; cursor: pointer;">
        <input type="radio" name="payment_method" value="Cash on Delivery"> 💵 Cash on Delivery
      </label>
    </div>

    <button class="btn-success" onclick="checkoutWhatsApp()" style="margin-bottom: 10px;">📲 Send Order to WhatsApp</button>
    <button onclick="clearCart()" style="background: transparent; border: 1px solid var(--danger); color: var(--danger); padding: 10px; width: 100%; border-radius: 50px; cursor: pointer; transition: 0.3s;">🗑️ Clear Cart</button>
  `;
}

// --- 5. WhatsApp Checkout (With Payment Method) ---
window.checkoutWhatsApp = function() {
  if(cart.length === 0) return;

  // Get selected payment method
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

  let message = "🛒 *New Grocery Order from Mobarok Online*\n\n";
  let total = 0;

  cart.forEach((item, index) => {
    let itemTotal = item.price * item.qty;
    total += itemTotal;
    message += `${index + 1}. *${item.name}*\n   ${item.qty} ${item.unit} x ₹${item.price} = ₹${itemTotal}\n`;
  });

  message += `\n*Total Amount: ₹${total.toFixed(2)}*\n`;
  message += `*Payment Method:* ${paymentMethod}\n\n`;
  message += "Please confirm my order and share delivery details.";

  const encodedMessage = encodeURIComponent(message);
  const phoneNumber = "918918636763"; 
  window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
};

// --- 6. Helpers ---
window.clearCart = function() {
  cart = [];
  localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  updateCartCount(); renderCartItems();
  showToast("Cart cleared.");
};

function setupFormHandlers() {
  const forms = ['rechargeForm', 'uploadForm'];
  forms.forEach(formId => {
    const el = document.getElementById(formId);
    if(el) {
      el.addEventListener('submit', function(e) {
        e.preventDefault();
        fetch("/", { method: "POST", body: new FormData(this) })
        .then(() => { showToast("Success!"); this.reset(); })
        .catch(() => showToast("Error sending request.", false));
      });
    }
  });
}

function showToast(msg, isSuccess = true) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderColor = isSuccess ? 'var(--success)' : 'var(--danger)';
  toast.innerHTML = `${isSuccess ? '✅' : '❌'} ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
