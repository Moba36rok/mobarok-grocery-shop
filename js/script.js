// --- Storage & State Management ---
const STORAGE_KEYS = { CART: 'mob_cart_v10' };
let products = [];
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART)) || []; [cite: 2]

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('productGrid');
    if (productGrid) {
        loadProducts(); // Only run on pages with a product grid (e.g., groceries.html) [cite: 37]
    }
    updateCartCount();
    setupEventListeners();
});

// --- 1. CMS Product Loading ---
async function loadProducts() {
    try {
        const res = await fetch('/data/products.json'); [cite: 3]
        const data = await res.json(); [cite: 4]
        products = data.items || [];
        renderProducts();
    } catch (err) {
        console.error("Error loading products:", err);
        document.getElementById('productGrid').innerHTML = '<p>Check back soon for fresh products!</p>'; [cite: 6]
    }
}

// --- 2. Dynamic Rendering ---
function renderProducts() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '';
    
    products.forEach(p => {
        const isOutOfStock = p.stock_status === "Out of Stock";
        const div = document.createElement('div');
        div.className = 'card product-card';
        
        div.innerHTML = `
            <img src="${p.img || 'https://via.placeholder.com/300'}" style="width:100%; border-radius:15px; ${isOutOfStock ? 'filter:grayscale(1); opacity:0.6;' : ''}">
            ${isOutOfStock ? '<span class="badge-danger">Out of Stock</span>' : ''}
            <h4 style="margin: 15px 0 5px;">${p.name}</h4>
            <p class="price" style="color:var(--primary); font-weight:800; font-size:1.2rem;">₹${p.price.toFixed(2)} <small>/ ${p.unit}</small></p>
            <button class="${isOutOfStock ? 'btn-light' : 'btn-primary'}" 
                    onclick="addToCart('${p.id}')" 
                    ${isOutOfStock ? 'disabled' : ''} 
                    style="width:100%; margin-top:10px;">
                ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
            </button>
        `; [cite: 13, 14, 20]
        productGrid.appendChild(div);
    });
}

// --- 3. Cart Functions ---
window.addToCart = function(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod || prod.stock_status === "Out of Stock") return;

    const existing = cart.find(c => c.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...prod, qty: 1 });
    } [cite: 21]

    saveCart();
    showToast(`${prod.name} added to cart!`);
};

function saveCart() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); [cite: 21]
    updateCartCount();
}

function updateCartCount() {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = cart.length; [cite: 22]
}

// --- 4. Netlify Form Handling (Document Uploads) ---
function setupEventListeners() {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            
            try {
                await fetch("/", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams(formData).toString(),
                }); [cite: 34]
                showToast("Document securely uploaded to server!"); [cite: 36]
                uploadForm.reset();
            } catch (error) {
                showToast("Upload failed. Try again.", false);
            }
        });
    }
}

// --- 5. UI Helpers ---
function showToast(msg, isSuccess = true) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeft = `5px solid ${isSuccess ? 'var(--success)' : 'var(--danger)'}`;
    toast.innerHTML = `<strong>${isSuccess ? '✅' : '❌'}</strong> ${msg}`; [cite: 8, 9]
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Close Modal logic
window.closeModal = function(id) {
    document.getElementById(id).classList.add('hidden'); [cite: 10]
};
