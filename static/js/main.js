// Main storefront logic: render products, manage cart, checkout, track
let PRODUCTS = [];
let CART = JSON.parse(localStorage.getItem('CART') || '[]');

const q = sel => document.querySelector(sel);
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

function money(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function notify(msg) { const t = q('#toast'); t.textContent = msg; t.hidden = false; setTimeout(()=> t.hidden = true, 2500); }

function calcPrice(base, grams) { const baseUnit = 5; return Math.round(base * (grams / baseUnit)); }

async function loadProducts() {
  const res = await fetch('/api/products');
  PRODUCTS = await res.json();
  renderProducts();
}

function renderProducts() {
  const wrap = q('#products');
  wrap.innerHTML = '';
  const af = q('#filter-audience').value;
  const tf = q('#filter-type').value;
  const mf = q('#filter-metal').value;
  PRODUCTS.filter(p => (af==='all'||p.audience===af) && (tf==='all'||p.type===tf) && (mf==='all'||p.metal===mf))
    .forEach(p => wrap.appendChild(productCard(p)));
}

function productCard(p) {
  const card = el('div','card');
  const img = el('img'); img.alt = p.name; card.appendChild(img);
  
  // Set up image loading with fallbacks
  setupImageWithFallback(img, p);
  
  img.style.backgroundColor = '#f5f5f5';
  img.style.minHeight = '200px';
  img.style.objectFit = 'cover';

  const info = el('div','info');
  const title = el('div','title'); title.textContent = p.name; info.appendChild(title);
  const meta = el('div','meta'); meta.textContent = `${p.audience} · ${p.type} · ${p.metal}`; info.appendChild(meta);

  const grams = el('select'); grams.className = 'grams';
  p.grams.forEach(g => { const o = el('option'); o.value = g; o.textContent = `${g} g`; grams.appendChild(o); });

  const priceLine = el('div','price-line');
  const price = el('div','price'); price.textContent = money(calcPrice(p.base_price, p.grams[0]));
  grams.addEventListener('change', ()=> price.textContent = money(calcPrice(p.base_price, Number(grams.value))));
  priceLine.append(grams, price);
  info.appendChild(priceLine);

  const buttonGroup = el('div','button-group');
  const view = el('button','btn secondary'); view.textContent = 'View';
  view.addEventListener('click', ()=> viewProduct(p));
  const add = el('button','btn'); add.textContent = 'Add to Cart';
  add.addEventListener('click', ()=> addToCart(p, Number(grams.value||p.grams[0])));
  buttonGroup.append(view, add);
  info.appendChild(buttonGroup);

  card.appendChild(info);
  return card;
}

function addToCart(p, grams) {
  const key = p.id + ':' + grams;
  const found = CART.find(i => i.key === key);
  if (found) found.qty += 1; else CART.push({ key, id: p.id, name: p.name, grams, price: calcPrice(p.base_price, grams), image: p.image, qty: 1 });
  saveCart();
  renderCart();
  openCart();
  notify('Added to cart');
}

function saveCart(){ localStorage.setItem('CART', JSON.stringify(CART)); }

function viewProduct(p) {
  const modal = el('div', 'product-modal');
  const overlay = el('div', 'modal-overlay');
  const content = el('div', 'modal-content');
  
  const close = el('button', 'modal-close'); close.textContent = '×';
  close.onclick = () => document.body.removeChild(modal);
  
  const img = el('img'); img.alt = p.name;
  img.style.maxWidth = '300px';
  img.style.maxHeight = '300px';
  img.style.objectFit = 'cover';
  setupImageWithFallback(img, p);
  
  const details = el('div', 'product-details');
  details.innerHTML = `
    <h2>${p.name}</h2>
    <p class="meta">${p.audience} • ${p.type} • ${p.metal}</p>
    <div class="price-options">
      <h3>Available weights:</h3>
      ${p.grams.map(g => `<div class="weight-option">${g}g - ${money(calcPrice(p.base_price, g))}</div>`).join('')}
    </div>
  `;
  
  content.append(close, img, details);
  overlay.onclick = () => document.body.removeChild(modal);
  modal.append(overlay, content);
  document.body.appendChild(modal);
}

function setupImageWithFallback(img, product) {
  const localPlaceholder = '/static/images/placeholder.svg';
  const webPlaceholder = `https://via.placeholder.com/500x500/1e2640/aab2c8?text=${encodeURIComponent(product.type)}`;
  
  // Show local placeholder immediately (most reliable)
  img.src = localPlaceholder;
  img.style.backgroundColor = '#1e2640';
  
  // Set up error handler that cascades through fallbacks
  img.onerror = function() {
    console.log('Image failed to load:', img.src);
    if (img.src.includes('placeholder.svg')) {
      // Local SVG failed, try web placeholder
      img.src = webPlaceholder;
    } else if (!img.src.includes('via.placeholder.com')) {
      // External image failed, go to web placeholder
      img.src = webPlaceholder;
    }
    // If web placeholder fails, we're out of options
  };
  
  // PRIORITY 1: Try the original product image if it exists and looks valid
  if (product.image && 
      product.image !== localPlaceholder && 
      product.image !== webPlaceholder &&
      !product.image.includes('source.unsplash.com')) {
    
    const testOriginal = new Image();
    testOriginal.onload = function() {
      img.src = product.image;
    };
    testOriginal.onerror = function() {
      console.log('Original product image failed, trying Unsplash');
      // If original fails, then try Unsplash as fallback
      tryUnsplashFallback();
    };
    testOriginal.src = product.image;
  } else {
    // If no valid original image, try Unsplash
    tryUnsplashFallback();
  }
  
  // PRIORITY 2: Unsplash as fallback
  function tryUnsplashFallback() {
    const query = product.name || `${product.metal} ${product.type} jewelry`;
    
    fetch(`/api/unsplash?q=${encodeURIComponent(query)}`)
      .then(response => {
        if (!response.ok) throw new Error('API failed');
        return response.json();
      })
      .then(data => {
        if (data && data.url && data.url !== img.src) {
          // Test if the Unsplash URL is actually accessible
          const testImg = new Image();
          testImg.onload = function() {
            img.src = data.url;
          };
          testImg.onerror = function() {
            console.log('Unsplash image failed, keeping current placeholder');
            // Keep current placeholder
          };
          testImg.src = data.url;
        }
      })
      .catch(error => {
        console.log('Failed to fetch from Unsplash API:', error);
        // Keep current placeholder
      });
  }
}

function setupCartImageWithFallback(img, item) {
  const placeholder = `https://via.placeholder.com/120x120/1e2640/aab2c8?text=${encodeURIComponent(item.name.slice(0, 3))}`;
  
  // Show placeholder immediately
  img.src = placeholder;
  
  // Set up error handler
  img.onerror = function() {
    if (img.src !== placeholder) {
      img.src = placeholder;
    }
    img.onerror = null;
  };
  
  // Try original image if available
  if (item.image && item.image !== placeholder) {
    const testImg = new Image();
    testImg.onload = function() {
      img.src = item.image;
    };
    testImg.onerror = function() {
      // Keep placeholder
    };
    testImg.src = item.image;
  }
}

function renderCart(){
  const list = q('#cart-items'); list.innerHTML = '';
  let total = 0;
  CART.forEach(it => {
    const row = el('div','cart-item');
    const i = el('img'); i.alt = it.name; row.appendChild(i);
    i.style.width = '60px';
    i.style.height = '60px';
    i.style.objectFit = 'cover';
    i.style.backgroundColor = '#f5f5f5';
    
    setupCartImageWithFallback(i, it);
    const mid = el('div'); mid.innerHTML = `<div><strong>${it.name}</strong></div><div class="meta">${it.grams} g × ${it.qty}</div>`; row.appendChild(mid);
    const right = el('div');
    const inc = el('button','icon-btn'); inc.textContent = '+'; inc.onclick = ()=> { it.qty++; saveCart(); renderCart(); };
    const dec = el('button','icon-btn'); dec.textContent = '-'; dec.onclick = ()=> { it.qty--; if (it.qty<=0) CART = CART.filter(x=>x.key!==it.key); saveCart(); renderCart(); };
    const price = el('div'); price.textContent = money(it.qty * it.price);
    right.append(inc,dec,price);
    row.appendChild(right);
    list.appendChild(row);
    total += it.qty * it.price;
  });
  q('#cart-total').textContent = money(total);
}

function openCart(){ q('#cart').classList.add('open'); }
function closeCart(){ q('#cart').classList.remove('open'); }

async function checkout(e){
  e.preventDefault();
  if (CART.length===0) return notify('Your cart is empty');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Placing Order…';
  const fd = new FormData(e.target);
  const payload = {
    name: fd.get('name'),
    email: fd.get('email'),
    phone: fd.get('phone'),
    items: CART.map(({id, grams, qty, price})=>({id, grams, qty, price}))
  };
  const res = await fetch('/api/order', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!res.ok) { btn.disabled = false; btn.textContent = 'Place Order'; return notify('Failed to place order'); }
  const data = await res.json();
  CART = []; saveCart(); renderCart(); closeCart();
  // Show a brief confirmation state before redirect
  const cartBox = q('.cart');
  if (cartBox) cartBox.classList.remove('open');
  const msg = el('div','order-confirmed');
  msg.innerHTML = `<h2>Order Confirmed!</h2><p>Order #${data.order_id}</p>`;
  msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:50;background:var(--card);border:1px solid var(--accent);border-radius:16px;padding:32px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.25);min-width:300px;';
  document.body.appendChild(msg);
  setTimeout(() => window.location.href = `/order/${data.order_id}`, 3200);
}

// Tracking
async function track(orderId){
  const res = await fetch(`/api/order/${orderId}/status`);
  if (!res.ok) { q('#track-result').textContent = 'Order not found'; return; }
  const data = await res.json();
  q('#track-result').textContent = `Status: ${data.status}`;
  const btn = q('#mark-delivered');
  btn.hidden = false; btn.onclick = async () => {
    await fetch(`/api/order/${orderId}/mark_delivered`, { method: 'POST' });
    track(orderId);
  };
}

// Events
window.addEventListener('DOMContentLoaded', () => {
  if (q('#products')) {
    ['#filter-audience','#filter-type','#filter-metal'].forEach(s => q(s).addEventListener('change', renderProducts));
    loadProducts();
  }
  if (q('#open-cart')) q('#open-cart').addEventListener('click', openCart);
  if (q('#close-cart')) q('#close-cart').addEventListener('click', closeCart);
  if (q('#checkout-form')) q('#checkout-form').addEventListener('submit', checkout);
  if (q('#track-form')) q('#track-form').addEventListener('submit', (e)=>{ e.preventDefault(); const id = q('#track-id').value.trim(); if(id) track(id); });
  const urlParams = new URLSearchParams(location.search); const oid = urlParams.get('order_id'); if (oid) track(oid);
});
