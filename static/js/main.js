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
    toast.innerHTML = `<span style="color:var(--primary); margin-right:10px;">✦</span> ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
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

document.addEventListener('DOMContentLoaded', () => {
    initBadges();

    // FAQ Accordion Logic (Global check)
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            faqItem.classList.toggle('active');
            
            // Close other items if one is opened
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== faqItem) {
                    item.classList.remove('active');
                }
            });
        });
    });

    // Close nav when any link inside is tapped
    document.querySelectorAll('.mobile-nav a').forEach(link => {
        link.addEventListener('click', () => {
            const mobileNav = document.getElementById('mobile-nav');
            const hamburger = document.getElementById('hamburger');
            if (mobileNav) {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    });

    // Scroll Reveal Intersection Observer
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        revealElements.forEach(el => revealObserver.observe(el));
    }

    // Scroll Listeners for Header Glassmorphism and Back-To-Top
    const header = document.getElementById('header');
    const scrollTopBtn = document.getElementById('scroll-top');
    
    function handleScroll() {
        const scrollY = window.scrollY;
        
        // Header scrolled state
        if (header) {
            if (scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
        
        // Back to top button
        if (scrollTopBtn) {
            if (scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Run once on load
});

// Hamburger Menu Toggle
window.toggleMenu = function(e) {
    if(e) e.stopPropagation();
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    
    if (hamburger && mobileNav) {
        hamburger.classList.toggle('active');
        mobileNav.classList.toggle('open');
        
        if (mobileNav.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
};

// Close nav when tapping outside
document.addEventListener('click', function(e) {
    const mobileNav = document.getElementById('mobile-nav');
    const hamburger = document.getElementById('hamburger');
    if (mobileNav && mobileNav.classList.contains('open')) {
        if (!mobileNav.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            mobileNav.classList.remove('open');
            document.body.style.overflow = '';
        }
    }
});
