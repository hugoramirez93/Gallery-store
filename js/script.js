const API_BASE = '/api';
let products = [];
let cart = [];

function loadCart() {
  try { cart = JSON.parse(localStorage.getItem('artCart')) || []; } catch { cart = []; }
}
function saveCart() { localStorage.setItem('artCart', JSON.stringify(cart)); }
loadCart();

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast visible ' + type;
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('visible'), 3000);
}

function formatPrice(cents) { return '$' + (cents / 100).toFixed(2); }

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const badge = document.getElementById('cartCount');
  badge.textContent = count;
  badge.classList.toggle('visible', count > 0);

  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');

  if (cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';

  container.innerHTML = cart.map(item => {
    const p = products.find(pr => pr.id === item.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="assets/images/${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=product-image-placeholder><span>✦</span></div>'">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${formatPrice(p.price)}</div>
          <div class="cart-item-actions">
            <div class="cart-item-qty">
              <button class="qty-btn" data-id="${p.id}" data-action="minus">−</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" data-id="${p.id}" data-action="plus">+</button>
            </div>
            <button class="cart-item-remove" data-id="${p.id}">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      if (btn.dataset.action === 'plus') addToCart(id, 1);
      else removeFromCart(id, 1);
    });
  });
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(parseInt(btn.dataset.id), Infinity);
    });
  });

  const total = cart.reduce((sum, item) => {
    const p = products.find(pr => pr.id === item.id);
    return sum + (p ? p.price * item.quantity : 0);
  }, 0);
  document.getElementById('cartTotal').textContent = formatPrice(total);
}

function addToCart(id, qty = 1) {
  const p = products.find(pr => pr.id === id);
  if (!p) return;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.quantity += qty;
  else cart.push({ id, quantity: qty });
  saveCart(); updateCartUI();
  toast(`Added "${p.name}" to cart`, 'success');
}

function removeFromCart(id, qty = 1) {
  const idx = cart.findIndex(i => i.id === id);
  if (idx === -1) return;
  if (qty === Infinity || cart[idx].quantity <= qty) {
    cart.splice(idx, 1);
  } else {
    cart[idx].quantity -= qty;
  }
  saveCart(); updateCartUI();
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  try {
    const res = await fetch(`${API_BASE}/products/available`);
    products = await res.json();
    if (products.length === 0) {
      grid.innerHTML = '<div class="loading">No works available at this time</div>';
      return;
    }
    grid.innerHTML = products.map(p => `
      <div class="product-card">
        <div class="product-image">
          <img src="assets/images/${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.outerHTML='<div class=product-image-placeholder><span class=art-initials>✦</span></div>'">
          <div class="product-overlay"></div>
        </div>
        <div class="product-body">
          <h3 class="product-name">${p.name}</h3>
          <p class="product-description">${p.description}</p>
          <div class="product-footer">
            <span class="product-price">${formatPrice(p.price)}</span>
            <button class="btn btn-sm buy-btn" data-id="${p.id}">Buy Now</button>
          </div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('.buy-btn').forEach(btn => {
      btn.addEventListener('click', () => addToCart(parseInt(btn.dataset.id)));
    });
  } catch (err) {
    grid.innerHTML = '<div class="loading">Unable to load collection. Please try again later.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  updateCartUI();

  document.getElementById('cartBtn').addEventListener('click', () => {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
  });
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  function closeCart() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
  }

  document.getElementById('hamburger').addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('open');
  });

  document.getElementById('checkoutBtn').addEventListener('click', async () => {
    const btn = document.getElementById('checkoutBtn');
    btn.disabled = true; btn.textContent = 'Processing...';
    try {
      const res = await fetch(`${API_BASE}/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ id: i.id, quantity: i.quantity }))
        })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Payment failed');
    } catch (err) {
      toast(err.message || 'Payment error. Please try again.', 'error');
      btn.disabled = false; btn.textContent = 'Checkout';
    }
  });

  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Thank you! Your message has been sent.', 'success');
    e.target.reset();
  });
});
