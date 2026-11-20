/**
 * MACMO ELECTRONICS — INTERACTIVE STORE LOGIC
 * WhatsApp Orders, Interactive Trade-In Calculator, Dynamic Catalog & Cart
 * Shop #1 Silverest Complex, Great East Road, Lusaka (Opp. UNILUS)
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // 1. STATE MANAGEMENT
  let currentCategory = 'all';
  let cart = JSON.parse(localStorage.getItem('macmo_cart')) || [];
  let wishlist = JSON.parse(localStorage.getItem('macmo_wishlist')) || [];

  // DOM Elements
  const productsGrid = document.getElementById('products-grid');
  const catTabs = document.querySelectorAll('.cat-tab-btn');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-drawer-overlay');
  const cartOpenBtn = document.getElementById('cart-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartBadge = document.getElementById('cart-count-badge');
  const wishBadge = document.getElementById('wish-count-badge');
  const checkoutBtn = document.getElementById('checkout-wa-btn');
  const searchOverlay = document.getElementById('search-modal-overlay');
  const searchOpenBtn = document.getElementById('search-btn');
  const searchCloseBtn = document.getElementById('search-close-btn');
  const modalSearchInput = document.getElementById('modal-search-input');
  const modalSearchResults = document.getElementById('search-modal-results');
  const catalogSearchInput = document.getElementById('catalog-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const catalogSortSelect = document.getElementById('catalog-sort-select');
  const toastContainer = document.getElementById('toast-container');

  // 2. RENDER PRODUCTS (Clean, Modern, Uncluttered Cards)
  function renderProducts(filterCat = 'all', searchQuery = '') {
    if (!productsGrid) return;

    let items = MACMO_STORE.products.slice();

    if (filterCat !== 'all') {
      items = items.filter(p => p.category === filterCat);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.specs.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    // Sort items
    if (catalogSortSelect) {
      const sortVal = catalogSortSelect.value;
      if (sortVal === 'price-asc') {
        items.sort((a, b) => a.price - b.price);
      } else if (sortVal === 'price-desc') {
        items.sort((a, b) => b.price - a.price);
      } else if (sortVal === 'rating') {
        items.sort((a, b) => (b.rating || 5) - (a.rating || 5));
      }
    }

    if (items.length === 0) {
      productsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-box-open empty-state-icon"></i>
          <h4>No devices found</h4>
          <p>Try selecting another category or chat with our desk on WhatsApp for custom orders.</p>
          <a href="https://wa.me/260972756767?text=Hello%20MacMo%20Electronics,%20I%20am%20looking%20for%20a%20device%20not%20listed" target="_blank" rel="noopener" class="btn-primary" style="margin-top: 14px;">
            <i class="fa-brands fa-whatsapp"></i> Inquire on WhatsApp
          </a>
        </div>
      `;
      return;
    }

    productsGrid.innerHTML = items.map(product => {
      const isSaved = wishlist.includes(product.id);
      const isCampus = product.badge && (product.badge.toLowerCase().includes('campus') || product.badge.toLowerCase().includes('study'));

      return `
        <article class="product-card" data-id="${product.id}">
          <div class="card-top-bar">
            <div class="card-tags">
              <span class="card-brand-tag">${product.brand}</span>
              ${product.badge ? `<span class="card-pill ${isCampus ? 'gold' : ''}">${product.badge}</span>` : ''}
            </div>
            <button type="button" class="card-wish-btn ${isSaved ? 'saved' : ''}" onclick="window.MacMo.toggleWishlist('${product.id}')" title="${isSaved ? 'Remove from wishlist' : 'Save to wishlist'}" aria-label="Save ${product.name}">
              <i class="${isSaved ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
            </button>
          </div>

          <div class="product-img-box" onclick="window.MacMo.buyDirectWA('${product.id}')" title="Order ${product.name} on WhatsApp">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
          </div>

          <div class="card-body">
            <h3 class="card-title" title="${product.name}">${product.name}</h3>
            <p class="card-specs" title="${product.specs}">${product.specs}</p>

            <div class="card-price-row">
              <span class="card-price">${product.priceFormatted}</span>
              <span class="card-stock"><span class="stock-dot"></span> In Stock</span>
            </div>

            <div class="card-btn-row">
              <button type="button" class="btn-card-cart" onclick="window.MacMo.addToCart('${product.id}')" title="Add to Bag">
                <i class="fa-solid fa-bag-shopping"></i> <span>Cart</span>
              </button>
              <button type="button" class="btn-card-wa" onclick="window.MacMo.buyDirectWA('${product.id}')" title="Order on WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> <span>Order</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // 3. CATEGORY TABS EVENT
  catTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      catTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-cat') || 'all';
      renderProducts(currentCategory, catalogSearchInput ? catalogSearchInput.value : '');
      // Ensure tab is scrolled into view on mobile
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });

  // Sort & Search events
  if (catalogSortSelect) {
    catalogSortSelect.addEventListener('change', () => {
      renderProducts(currentCategory, catalogSearchInput ? catalogSearchInput.value : '');
    });
  }

  if (catalogSearchInput) {
    catalogSearchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = q.trim() ? 'block' : 'none';
      }
      renderProducts(currentCategory, q);
    });
  }

  if (clearSearchBtn && catalogSearchInput) {
    clearSearchBtn.addEventListener('click', () => {
      catalogSearchInput.value = '';
      clearSearchBtn.style.display = 'none';
      renderProducts(currentCategory, '');
    });
  }

  // 4. CART SYSTEM
  function updateCartUI() {
    localStorage.setItem('macmo_cart', JSON.stringify(cart));

    // Update badges
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    if (cartBadge) {
      cartBadge.textContent = totalCount;
      cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    const drawerCountEl = document.getElementById('drawer-item-count');
    if (drawerCountEl) {
      drawerCountEl.textContent = `${totalCount} item${totalCount !== 1 ? 's' : ''}`;
    }

    // Render items in cart drawer
    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-cart-view">
          <i class="fa-solid fa-bag-shopping empty-cart-icon"></i>
          <h4>Your bag is empty</h4>
          <p>Browse our catalog and add flagships or accessories to your bag.</p>
        </div>
      `;
      if (cartSubtotalEl) cartSubtotalEl.textContent = 'K 0.00';
      return;
    }

    let subtotal = 0;
    cartItemsList.innerHTML = cart.map(item => {
      const p = MACMO_STORE.products.find(prod => prod.id === item.id);
      if (!p) return '';
      const lineTotal = p.price * item.qty;
      subtotal += lineTotal;

      return `
        <div class="cart-item" data-id="${p.id}">
          <img src="${p.image}" alt="${p.name}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${p.name}</h4>
            <span class="cart-item-price">${p.priceFormatted}</span>
            <div class="cart-qty-row">
              <button type="button" class="qty-btn" onclick="window.MacMo.updateQty('${p.id}', -1)" aria-label="Decrease quantity">&minus;</button>
              <span class="qty-val">${item.qty}</span>
              <button type="button" class="qty-btn" onclick="window.MacMo.updateQty('${p.id}', 1)" aria-label="Increase quantity">&plus;</button>
            </div>
          </div>
          <button type="button" class="cart-remove-btn" onclick="window.MacMo.updateQty('${p.id}', -${item.qty})" title="Remove item" aria-label="Remove ${p.name}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join('');

    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = `K ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  function addToCart(productId) {
    const existing = cart.find(item => item.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: productId, qty: 1 });
    }
    updateCartUI();

    const product = MACMO_STORE.products.find(p => p.id === productId);
    showToast(`Added ${product ? product.name : 'item'} to your bag!`, 'fa-bag-shopping');
  }

  function updateQty(productId, delta) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
      cart[itemIndex].qty += delta;
      if (cart[itemIndex].qty <= 0) {
        cart.splice(itemIndex, 1);
      }
      updateCartUI();
    }
  }

  function openCart() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.add('open');
      cartOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCart() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.remove('open');
      cartOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (cartOpenBtn) cartOpenBtn.addEventListener('click', openCart);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // 5. WHATSAPP CHECKOUT GENERATOR
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length === 0) {
        showToast('Your shopping bag is empty!', 'fa-circle-exclamation');
        return;
      }

      let orderText = `*ORDER REQUEST — MACMO ELECTRONICS*\n`;
      orderText += `Showroom: Shop #1, Silverest Complex (Opp. UNILUS)\n`;
      orderText += `----------------------------------------\n`;

      let total = 0;
      cart.forEach((item, index) => {
        const p = MACMO_STORE.products.find(prod => prod.id === item.id);
        if (p) {
          const itemTotal = p.price * item.qty;
          total += itemTotal;
          orderText += `${index + 1}. *${p.name}* (x${item.qty})\n`;
          orderText += `   Specs: ${p.specs}\n`;
          orderText += `   Subtotal: K ${itemTotal.toLocaleString('en-US')}\n\n`;
        }
      });

      orderText += `----------------------------------------\n`;
      orderText += `*TOTAL ESTIMATE: K ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}*\n`;
      orderText += `----------------------------------------\n`;
      orderText += `Please confirm availability and delivery to my location (UNILUS / Lusaka address).`;

      const encoded = encodeURIComponent(orderText);
      const url = `https://wa.me/260972756767?text=${encoded}`;
      window.open(url, '_blank');
    });
  }

  // 6. DIRECT SINGLE PRODUCT WHATSAPP ORDER
  function buyDirectWA(productId) {
    const product = MACMO_STORE.products.find(p => p.id === productId);
    if (!product) return;

    let msg = `*PRODUCT INQUIRY / ORDER — MACMO ELECTRONICS*\n`;
    msg += `Device: *${product.name}*\n`;
    msg += `Category: ${product.category.toUpperCase()} | Brand: ${product.brand}\n`;
    msg += `Specs: ${product.specs}\n`;
    msg += `Price: ${product.priceFormatted}\n`;
    msg += `Showroom: Shop #1 Silverest Complex (Opp. UNILUS)\n\n`;
    msg += `Hello, I would like to order this device. Please let me know current availability for pickup or delivery.`;

    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/260972756767?text=${encoded}`;
    window.open(url, '_blank');
  }

  // 7. INTERACTIVE TRADE-IN CALCULATOR
  const tradeBrandSelect = document.getElementById('trade-brand');
  const tradeModelSelect = document.getElementById('trade-model');
  const tradeCondSelect = document.getElementById('trade-condition');
  const tradeTargetSelect = document.getElementById('trade-target');
  const tradeCreditVal = document.getElementById('trade-credit-val');
  const tradeDiffVal = document.getElementById('trade-diff-val');
  const bookTradeBtn = document.getElementById('book-trade-in-btn');

  function populateTradeModels() {
    if (!tradeBrandSelect || !tradeModelSelect) return;
    const brand = tradeBrandSelect.value;
    const models = MACMO_STORE.tradeInCatalog[brand] || [];

    tradeModelSelect.innerHTML = models.map(m => `
      <option value="${m.id}" data-base="${m.baseValue}">${m.name} (~K ${m.baseValue.toLocaleString()})</option>
    `).join('');

    calculateTradeIn();
  }

  function calculateTradeIn() {
    if (!tradeModelSelect || !tradeTargetSelect) return;

    const selectedOption = tradeModelSelect.selectedOptions[0];
    if (!selectedOption) return;
    const baseValue = parseFloat(selectedOption.getAttribute('data-base')) || 0;

    const condition = tradeCondSelect ? tradeCondSelect.value : 'good';
    let multiplier = 0.85;
    if (condition === 'flawless') multiplier = 1.0;
    else if (condition === 'good') multiplier = 0.85;
    else if (condition === 'fair') multiplier = 0.65;

    const estimatedCredit = Math.round(baseValue * multiplier);

    const targetId = tradeTargetSelect.value;
    const target = MACMO_STORE.upgradeTargets.find(t => t.id === targetId);
    const targetPrice = target ? target.price : 24999;

    const difference = Math.max(0, targetPrice - estimatedCredit);

    if (tradeCreditVal) {
      tradeCreditVal.textContent = `K ${estimatedCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (tradeDiffVal) {
      tradeDiffVal.textContent = `K ${difference.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  if (tradeBrandSelect) tradeBrandSelect.addEventListener('change', populateTradeModels);
  if (tradeModelSelect) tradeModelSelect.addEventListener('change', calculateTradeIn);
  if (tradeCondSelect) tradeCondSelect.addEventListener('change', calculateTradeIn);
  if (tradeTargetSelect) tradeTargetSelect.addEventListener('change', calculateTradeIn);

  if (bookTradeBtn) {
    bookTradeBtn.addEventListener('click', () => {
      const brand = tradeBrandSelect ? tradeBrandSelect.value : 'Apple';
      const model = tradeModelSelect && tradeModelSelect.selectedOptions[0] ? tradeModelSelect.selectedOptions[0].text : 'iPhone';
      const cond = tradeCondSelect ? tradeCondSelect.value : 'Good';
      const target = tradeTargetSelect && tradeTargetSelect.selectedOptions[0] ? tradeTargetSelect.selectedOptions[0].text : 'iPhone 15 Pro Max';
      const credit = tradeCreditVal ? tradeCreditVal.textContent : 'K 0.00';
      const diff = tradeDiffVal ? tradeDiffVal.textContent : 'K 0.00';

      let msg = `*DEVICE TRADE-IN / SWAP BOOKING — MACMO ELECTRONICS*\n`;
      msg += `Showroom: Shop #1 Silverest Complex (Opp. UNILUS)\n`;
      msg += `----------------------------------------\n`;
      msg += `Current Device: *${model}* (${brand})\n`;
      msg += `Condition: *${cond.toUpperCase()}*\n`;
      msg += `Target Upgrade: *${target}*\n`;
      msg += `Est. Trade-In Credit: *${credit}*\n`;
      msg += `Est. Difference to Pay: *${diff}*\n`;
      msg += `----------------------------------------\n`;
      msg += `Hello MacMo Desk, I would like to bring my device for physical inspection & swap!`;

      const encoded = encodeURIComponent(msg);
      window.open(`https://wa.me/260972756767?text=${encoded}`, '_blank');
    });
  }

  // 8. WISHLIST SYSTEM
  function updateWishUI() {
    localStorage.setItem('macmo_wishlist', JSON.stringify(wishlist));
    if (wishBadge) {
      wishBadge.textContent = wishlist.length;
      wishBadge.style.display = wishlist.length > 0 ? 'flex' : 'none';
    }
  }

  function toggleWishlist(productId) {
    const idx = wishlist.indexOf(productId);
    const product = MACMO_STORE.products.find(p => p.id === productId);
    const pName = product ? product.name : 'device';

    if (idx > -1) {
      wishlist.splice(idx, 1);
      showToast(`Removed ${pName} from wishlist`, 'fa-heart');
    } else {
      wishlist.push(productId);
      showToast(`Saved ${pName} to wishlist!`, 'fa-heart');
    }
    updateWishUI();
    renderProducts(currentCategory, catalogSearchInput ? catalogSearchInput.value : '');
  }

  // 9. LIVE SEARCH MODAL
  function openSearch() {
    if (searchOverlay) {
      searchOverlay.style.display = 'flex';
      if (modalSearchInput) {
        modalSearchInput.value = '';
        setTimeout(() => modalSearchInput.focus(), 50);
      }
      renderSearchResults('');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSearch() {
    if (searchOverlay) {
      searchOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function renderSearchResults(query) {
    if (!modalSearchResults) return;
    const q = query.toLowerCase().trim();

    if (!q) {
      modalSearchResults.innerHTML = `
        <div class="search-empty-hint">
          <p>Search by model: <strong>iPhone 15</strong>, <strong>PS5</strong>, <strong>MacBook</strong>, <strong>EcoFlow</strong>, or <strong>AirPods</strong></p>
        </div>
      `;
      return;
    }

    const matches = MACMO_STORE.products.filter(p => 
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.specs.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      modalSearchResults.innerHTML = `
        <div class="search-empty-hint">
          <p>No matches found for "<strong>${query}</strong>".</p>
        </div>
      `;
      return;
    }

    modalSearchResults.innerHTML = matches.map(p => `
      <div class="search-match-item" onclick="window.MacMo.selectSearchResult('${p.id}')">
        <img src="${p.image}" alt="${p.name}">
        <div>
          <span class="search-match-name">${p.name}</span>
          <span class="search-match-specs">${p.specs}</span>
        </div>
        <span class="search-match-price">${p.priceFormatted}</span>
      </div>
    `).join('');
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener('click', openSearch);
  if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);
  if (searchOverlay) {
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  if (modalSearchInput) {
    modalSearchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });
  }

  // Keyboard shortcut: '/' opens search, 'Escape' closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      closeCart();
      window.closeMobileNav();
    }
  });

  // 10. TOAST NOTIFICATION
  function showToast(message, icon = 'fa-circle-check') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-bubble';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 11. GLOBAL API EXPOSURE
  window.filterByCat = function(catId) {
    currentCategory = catId;
    catTabs.forEach(b => {
      if (b.getAttribute('data-cat') === catId) {
        b.classList.add('active');
        b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        b.classList.remove('active');
      }
    });
    renderProducts(currentCategory, catalogSearchInput ? catalogSearchInput.value : '');
    const store = document.getElementById('store');
    if (store) store.scrollIntoView({ behavior: 'smooth' });
  };

  window.addToCart = addToCart;
  window.buyDirectWA = buyDirectWA;
  window.toggleWishlist = toggleWishlist;
  window.updateQty = updateQty;
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.showWishlistModal = function() {
    if (wishlist.length === 0) {
      showToast("No saved items yet. Tap the heart on any product!", "fa-heart");
      return;
    }
    const store = document.getElementById('store');
    if (store) store.scrollIntoView({ behavior: 'smooth' });
    showToast(`Showing your saved items!`, "fa-heart");
  };

  window.MacMo = {
    addToCart,
    updateQty,
    buyDirectWA,
    toggleWishlist,
    selectSearchResult: function (id) {
      closeSearch();
      const el = document.querySelector(`.product-card[data-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '2px solid var(--brand)';
        setTimeout(() => el.style.outline = 'none', 2000);
      }
    }
  };

  // Mobile Navigation Drawer Helpers
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');

  window.toggleMobileNav = function() {
    if (mobileDrawer) {
      mobileDrawer.classList.toggle('open');
      const icon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;
      if (icon) {
        if (mobileDrawer.classList.contains('open')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-xmark');
        } else {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      }
    }
  };

  window.closeMobileNav = function() {
    if (mobileDrawer && mobileDrawer.classList.contains('open')) {
      mobileDrawer.classList.remove('open');
      const icon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;
      if (icon) {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      }
    }
  };

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', window.toggleMobileNav);
  }

  // Close when clicking outside drawer
  document.addEventListener('click', (e) => {
    if (mobileDrawer && mobileDrawer.classList.contains('open')) {
      if (!mobileDrawer.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        window.closeMobileNav();
      }
    }
  });

  // INITIAL LOAD
  populateTradeModels();
  renderProducts('all');
  updateCartUI();
  updateWishUI();
});
