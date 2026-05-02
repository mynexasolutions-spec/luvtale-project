// ================= PRODUCTS =================
let products = [];

async function fetchProducts(filter = 'all') {
    try {
        const response = await fetch(`/api/products?category=${filter}`);
        products = await response.json();
        renderProducts(filter, true); // true means don't re-fetch
    } catch (error) {
        console.error("Error fetching products:", error);
    }
}

// ================= STATE =================
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let activeFilter = 'all';
let currentProductId = null;

// ================= RENDER PRODUCTS =================
function renderProducts(filter, skipFetch = false) {
    if (!skipFetch) {
        fetchProducts(filter);
        return;
    }

    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = products.map(p => `
        <div class="product-card">
            <div class="product-img-wrap">
                <div style="background:${p.bg};height:100%;display:flex;align-items:center;justify-content:center;font-size:70px">
                    ${p.emoji}
                </div>

                <div class="product-actions">
                    <button onclick="openModal(${p.id})">Quick View</button>

                    <div class="product-icon-btns">
                        <div class="product-icon-btn" onclick="wishlistToggle(this)">♡</div>
                        <div class="product-icon-btn" onclick="addToCart(${p.id})">🛒</div>
                    </div>
                </div>

                <span class="product-badge">${p.badge}</span>
            </div>

            <div class="product-info">
                <h5>${p.name}</h5>
                <div class="product-info-row">
                    <div>$${p.price} <del>$${p.oldPrice}</del></div>
                    <div>${'★'.repeat(p.rating)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Initial fetch
fetchProducts('all');

// ================= FILTER =================
document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        activeFilter = this.dataset.filter;
        renderProducts(activeFilter);
    });
});

// ================= ADD TO CART =================
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    saveCart();
}

// ================= SAVE =================
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCart(); // important
}

// ================= CART COUNT =================
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) cartCountEl.textContent = count;

    const mobileCartCountEl = document.getElementById('mobile-cart-count');
    if (mobileCartCountEl) mobileCartCountEl.textContent = count;
}

// ================= RENDER CART =================
function renderCart() {
    const container = document.getElementById('cart-items');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px;">Cart is empty</p>`;
        const totalEl = document.getElementById('cart-total');
        if (totalEl) totalEl.textContent = '$0.00';
        const headerCountEl = document.getElementById('cart-header-count');
        if (headerCountEl) headerCountEl.textContent = '(0 items)';
        return;
    }

    let total = 0;

    container.innerHTML = cart.map(item => {
        total += item.price * item.qty;

        return `
        <div class="cart-item">
            <div style="width:72px;height:80px;border-radius:10px;background:${item.bg};
                display:flex;align-items:center;justify-content:center;font-size:32px">
                ${item.emoji}
            </div>

            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price}</div>

                <div class="cart-item-qty">
                    <div class="qty-btn" onclick="changeQty(${item.id}, -1)">−</div>
                    <span class="qty-num">${item.qty}</span>
                    <div class="qty-btn" onclick="changeQty(${item.id}, 1)">+</div>
                </div>
            </div>

            <span class="remove-item" onclick="removeFromCart(${item.id})">✕</span>
        </div>
        `;
    }).join('');

    const totalEl = document.getElementById('cart-total');
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);

    const count = cart.reduce((sum, i) => sum + i.qty, 0);
    const headerCountEl = document.getElementById('cart-header-count');
    if (headerCountEl) headerCountEl.textContent = `(${count} items)`;
}

// ================= CHANGE QTY =================
function changeQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.qty += change;

    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== id);
    }

    saveCart();
}

// ================= REMOVE =================
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

// ================= MODAL =================
function openModal(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;

    currentProductId = id;

    document.getElementById('modal-name').textContent = p.name;
    document.getElementById('modal-price').textContent = '$' + p.price;
    document.getElementById('modal-img-wrap').innerHTML = `<div style="font-size:100px">${p.emoji}</div>`;
    document.getElementById('modal-img-wrap').style.background = p.bg;

    // Use description from backend
    const descEl = document.getElementById('modal-desc');
    if (descEl) descEl.textContent = p.desc || "Premium quality product with exceptional design.";

    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
}

function addToCartFromModal() {
    if (currentProductId) {
        addToCart(currentProductId);
        closeModal();
    }
}

// ================= CART SIDEBAR =================
function openCart() {
    document.getElementById('cart-sidebar').classList.add('open');
}

function closeCart() {
    document.getElementById('cart-sidebar').classList.remove('open');
}

// ================= WISHLIST =================
function wishlistToggle(el) {
    el.textContent = el.textContent === '♡' ? '♥' : '♡';
    el.style.color = el.textContent === '♥' ? 'red' : '';
}

// ================= SEARCH =================
function openSearch() {
    document.getElementById('search-overlay').classList.add('open');
    document.getElementById('search-input').focus();
}

function closeSearch() {
    document.getElementById('search-overlay').classList.remove('open');
}

function handleSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    if (!resultsContainer) return;

    if (!query || query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.cat.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<p style="padding:10px; color:#666;">No products found</p>';
    } else {
        resultsContainer.innerHTML = filtered.map(p => `
            <div class="search-result-item" onclick="openModal(${p.id}); closeSearch();">
                <span style="font-size:24px; margin-right:10px;">${p.emoji}</span>
                <div>
                    <div style="font-weight:600; font-size:14px;">${p.name}</div>
                    <div style="font-size:12px; color:var(--primary);">$${p.price}</div>
                </div>
            </div>
        `).join('');
    }
    resultsContainer.style.display = 'block';
}

// ================= NEWSLETTER =================
async function subscribeNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input').value;

    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        alert(data.message || "Thank you for subscribing!");
        event.target.reset();
    } catch (error) {
        alert("Subscription failed. Please try again.");
    }
}

// ================= MENU =================
function toggleMenu() {
    document.getElementById('mobile-nav').classList.toggle('open');
}

// ================= SCROLL =================
window.addEventListener('scroll', () => {
    const scrollTop = document.getElementById('scroll-top');
    if (scrollTop) {
        scrollTop.classList.toggle('visible', window.scrollY > 400);
    }
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ================= INIT =================
updateCartCount();
renderCart();