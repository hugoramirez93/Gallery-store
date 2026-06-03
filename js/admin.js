const API = '/api';
let token = localStorage.getItem('adminToken');
let products = [];

function showView(view) {
  document.getElementById('loginView').style.display = view === 'login' ? '' : 'none';
  document.getElementById('panelView').style.display = view === 'panel' ? '' : 'none';
}

function formatPrice(cents) { return '$' + (cents / 100).toFixed(2); }

async function api(url, opts = {}) {
  const headers = { ...opts.headers };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + url, { ...opts, headers });
  if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem('adminToken');
  showView('login');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.getElementById('productForm').reset();
  document.getElementById('formId').value = '';
}

function openModal(product = null) {
  document.getElementById('modalTitle').textContent = product ? 'Edit Product' : 'Add Product';
  document.getElementById('modalSubmit').textContent = product ? 'Update Product' : 'Save Product';
  if (product) {
    document.getElementById('formId').value = product.id;
    document.getElementById('formName').value = product.name;
    document.getElementById('formDesc').value = product.description;
    document.getElementById('formPrice').value = (product.price / 100).toFixed(2);
    document.getElementById('formAvailable').value = product.available;
    document.getElementById('formImage').required = false;
  } else {
    document.getElementById('formId').value = '';
    document.getElementById('formName').value = '';
    document.getElementById('formDesc').value = '';
    document.getElementById('formPrice').value = '';
    document.getElementById('formAvailable').value = '1';
    document.getElementById('formImage').required = true;
  }
  document.getElementById('modalOverlay').classList.add('active');
}

async function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  try {
    products = await api('/products');
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--color-text-light)">No products yet. Add your first painting!</td></tr>';
      return;
    }
    tbody.innerHTML = products.map(p => `
      <tr>
        <td><img class="thumb" src="../assets/images/${p.image}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23e5e0d8%22 width=%2248%22 height=%2248%22/><text x=%2224%22 y=%2230%22 text-anchor=%22middle%22 fill=%22%236b6b6b%22 font-size=%2216%22>✦</text></svg>'"></td>
        <td><strong>${p.name}</strong><br><small style="color:var(--color-text-light)">${p.description.substring(0, 60)}${p.description.length > 60 ? '...' : ''}</small></td>
        <td>${formatPrice(p.price)}</td>
        <td><span class="badge ${p.available ? 'badge-avail' : 'badge-unavail'}">${p.available ? 'Available' : 'Unavailable'}</span></td>
        <td>
          <div class="actions">
            <button class="btn btn-sm btn-outline-dark edit-btn" data-id="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = products.find(x => x.id === parseInt(btn.dataset.id));
        if (p) openModal(p);
      });
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        try {
          await api('/products/' + btn.dataset.id, { method: 'DELETE' });
          loadProducts();
        } catch (e) { alert(e.message); }
      });
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--color-error)">Error loading products</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showView('panel');
    document.getElementById('adminUserDisplay').textContent = localStorage.getItem('adminUser') || 'Admin';
    loadProducts();
  } else {
    showView('login');
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('loginError');
    errEl.style.display = 'none';
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: document.getElementById('loginUser').value,
          password: document.getElementById('loginPass').value
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      token = data.token;
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', data.username);
      document.getElementById('adminUserDisplay').textContent = data.username;
      showView('panel');
      loadProducts();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('addProductBtn').addEventListener('click', () => openModal(null));

  document.getElementById('modalCancel').addEventListener('click', closeModal);

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('formId').value;
    const fd = new FormData();
    fd.append('name', document.getElementById('formName').value);
    fd.append('description', document.getElementById('formDesc').value);
    fd.append('price', document.getElementById('formPrice').value);
    fd.append('available', document.getElementById('formAvailable').value);
    const fileInput = document.getElementById('formImage');
    if (fileInput.files.length > 0) fd.append('image', fileInput.files[0]);
    try {
      if (id) {
        await api('/products/' + id, { method: 'PUT', body: fd });
      } else {
        await api('/products', { method: 'POST', body: fd });
      }
      closeModal();
      loadProducts();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  });
});
