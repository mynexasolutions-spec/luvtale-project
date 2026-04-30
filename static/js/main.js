// Luvtale Boutique Global Scripts

// Sidebar Cart Logic
function openCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && overlay) {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        updateCartUI();
    }
}

function closeCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// Quick View Modal Logic
async function openQuickView(productId) {
    try {
        const res = await fetch(`/api/product/${productId}`);
        const product = await res.json();
        
        document.getElementById('modal-img').src = product.img_primary;
        document.getElementById('modal-name').innerText = product.name;
        document.getElementById('modal-price').innerText = `₹${product.price}`;
        document.getElementById('modal-desc').innerText = product.description || '';
        document.getElementById('modal-add-btn').onclick = () => {
            addToCart(product.id);
            closeModal();
        };
        
        document.getElementById('modal-overlay').classList.add('active');
        document.getElementById('modal-box').classList.add('active');
    } catch (err) {
        console.error('Error loading quick view:', err);
    }
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('modal-box').classList.remove('active');
}

// Search Logic
function openSearch() {
    document.getElementById('search-overlay').style.display = 'flex';
}

function closeSearch() {
    document.getElementById('search-overlay').style.display = 'none';
}

// API Interactions
async function addToCart(productId, quantity = 1, variationId = null) {
    try {
        let url = `/api/add-to-cart/${productId}`;
        if (variationId) url += `?v=${variationId}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: quantity })
        });
        const data = await response.json();
        if (data.success) {
            updateBadges(data.cart_count, null);
            if (window.location.pathname === '/cart') loadCartPage();
            if (document.getElementById('cart-sidebar').classList.contains('active')) updateCartUI();
            showToast('Success', 'Item added to your bag');
        }
    } catch (err) {
        console.error('Error adding to cart:', err);
    }
}

async function addToWishlist(productId) {
    try {
        const response = await fetch(`/api/add-to-wishlist/${productId}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (data.success) {
            updateBadges(null, data.wishlist_count);
            showToast('Wishlist', 'Saved to your favorites');
        }
    } catch (err) {
        console.error('Error adding to wishlist:', err);
    }
}

async function updateCartUI() {
    const res = await fetch('/api/cart-data');
    const data = await res.json();
    
    const container = document.getElementById('cart-items');
    const countHeader = document.getElementById('cart-header-count');
    const totalEl = document.getElementById('cart-total');
    
    if (!container) return;
    
    countHeader.innerText = `(${data.count} items)`;
    totalEl.innerText = `₹${data.total.toFixed(2)}`;
    
    container.innerHTML = '';
    for (const [id, item] of Object.entries(data.cart)) {
        container.innerHTML += `
            <div class="cart-item" style="display:flex; gap:15px; margin-bottom:20px; align-items:center; position:relative; background:#fff; padding:10px; border-radius:15px; box-shadow:0 5px 15px rgba(0,0,0,0.02);">
                <a href="/product/${id}" style="width:70px; height:70px; background:#f8f8f8; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <img src="${item.img}" style="max-width:80%; max-height:80%; object-fit:contain;">
                </a>
                <div style="flex:1;">
                    <a href="/product/${id}" style="text-decoration:none; color:inherit;">
                        <h5 style="font-size:14px; margin-bottom:4px; font-weight:600;">${item.name}</h5>
                    </a>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <div style="display:flex; align-items:center; border:1px solid #eee; border-radius:6px; overflow:hidden;">
                            <button onclick="updateQuantity('${id}', -1)" style="border:none; background:none; padding:2px 8px; cursor:pointer; font-weight:700;">-</button>
                            <span style="padding:0 8px; font-size:12px; font-weight:700;">${item.quantity}</span>
                            <button onclick="updateQuantity('${id}', 1)" style="border:none; background:none; padding:2px 8px; cursor:pointer; font-weight:700;">+</button>
                        </div>
                        <div style="font-size:13px; color:var(--primary); font-weight:700;">₹${item.price}</div>
                    </div>
                </div>
                <button onclick="removeFromCart('${id}')" style="position:absolute; top:-5px; right:-5px; width:22px; height:22px; background:#ff4d4d; color:#fff; border:none; border-radius:50%; font-size:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.1);">✕</button>
            </div>
        `;
    }
}

async function updateQuantity(productId, delta) {
    try {
        const res = await fetch(`/api/update-cart/${productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta: delta })
        });
        const data = await res.json();
        if (data.success) {
            updateBadges(data.cart_count, null);
            updateCartUI();
        }
    } catch (err) { console.error(err); }
}

async function removeFromCart(productId) {
    if (!confirm('Remove this item from your bag?')) return;
    try {
        const res = await fetch(`/api/remove-from-cart/${productId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            updateBadges(data.cart_count, null);
            updateCartUI();
        }
    } catch (err) { console.error(err); }
}

function updateBadges(cartCount, wishlistCount) {
    if (cartCount !== null) {
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) cartBadge.innerText = cartCount;
        const mobileBadge = document.getElementById('mobile-cart-count');
        if (mobileBadge) mobileBadge.innerText = cartCount;
    }
    if (wishlistCount !== null) {
        const wishlistBadge = document.getElementById('wishlist-count');
        if (wishlistBadge) wishlistBadge.innerText = wishlistCount;
    }
}

// Toast Feedback System
function showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; 
        background: #000; color: #fff; padding: 15px 30px; 
        border-radius: 12px; z-index: 10000; font-weight: 700;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        animation: slideUp 0.5s ease forwards;
    `;
    toast.innerHTML = `<span style="color:var(--primary); margin-right:10px;">✦</span> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.5s ease forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Initialize Badges on Load
async function initBadges() {
    try {
        const cartRes = await fetch('/api/cart-data');
        const cartData = await cartRes.json();
        const wishRes = await fetch('/api/wishlist-data');
        const wishData = await wishRes.json();
        updateBadges(cartData.count, wishData.count);
    } catch (err) {
        console.warn('Could not init badges:', err);
    }
}

// CSS for Toast Animation
const style = document.createElement('style');
style.innerHTML = `
    @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes slideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100px); opacity: 0; } }
    .cart-sidebar.active { right: 0; }
    .cart-overlay.active { display: block; }
    .modal-overlay.active { display: flex; opacity: 1; pointer-events: all; }
    .modal-box.active { transform: translateY(0); opacity: 1; }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', initBadges);
