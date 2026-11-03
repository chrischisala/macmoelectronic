/**
 * MACMO ELECTRONICS — MAIN APPLICATION SCRIPT (HBS AESTHETIC EDITION)
 * Shop #1, Silverest Complex, Great East Road, Lusaka (Opposite UNILUS)
 * WhatsApp: +260 972 756 767 | +260 572 408 101
 * Built with Home of Beautiful Scents Visual Architecture & Responsive Geometry
 */

(function () {
  'use strict';

  // 1. STATE & CONSTANTS
  let WA_NUMBER = '260972756767';
  let cart = [];
  let wishlist = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let currentSort = 'featured';
  let activeModalProductId = null;

  // Load custom store settings if modified in /admin/
  try {
    const customSettings = localStorage.getItem('macmo_store_settings');
    if (customSettings) {
      const cfg = JSON.parse(customSettings);
      if (cfg.whatsappPrimary) {
        WA_NUMBER = cfg.whatsappPrimary.replace(/[^0-9]/g, '');
      }
    }
  } catch (e) {}

  // Apply catalog overrides & deleted items filter from /admin/
  try {
    const deletedIds = JSON.parse(localStorage.getItem('macmo_deleted_product_ids') || '[]');
    const customCatalog = localStorage.getItem('macmo_catalog_override');
    if (customCatalog) {
      const parsed = JSON.parse(customCatalog);
      if (Array.isArray(parsed) && typeof MACMO_STORE !== 'undefined') {
        MACMO_STORE.products = parsed.filter(p => !deletedIds.includes(p.id));
      }
    } else if (typeof MACMO_STORE !== 'undefined' && Array.isArray(MACMO_STORE.products) && deletedIds.length > 0) {
      MACMO_STORE.products = MACMO_STORE.products.filter(p => !deletedIds.includes(p.id));
    }
  } catch (e) {}

  // Real-time Cloud Sync with Google Firebase Firestore (if enabled)
  if (window.MACMO_FIREBASE && window.MACMO_FIREBASE.enabled && window.firebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.MACMO_FIREBASE.config);
      }
      const db = firebase.firestore();
      db.collection('products').onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const cloudProducts = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            cloudProducts.push(data);
          });
          if (cloudProducts.length > 0 && typeof MACMO_STORE !== 'undefined') {
            MACMO_STORE.products = cloudProducts;
            try {
              localStorage.setItem('macmo_catalog_override', JSON.stringify(cloudProducts));
            } catch (e) {}
            if (typeof renderCatalog === 'function') {
              renderCatalog();
            }
          }
        }
      }, (err) => {
        console.warn('Firestore real-time sync note:', err);
      });

      // Also listen to store settings if synced
      db.collection('settings').doc('store').onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.whatsappPrimary) {
            WA_NUMBER = data.whatsappPrimary.replace(/[^0-9]/g, '');
          }
        }
      }, () => {});
    } catch (err) {
      console.warn('Firebase initialization note:', err);
    }
  }
  // Real-time listener for cross-tab catalog updates & deletions from /admin/
  try {
    const bc = new BroadcastChannel('macmo_catalog_channel');
    bc.onmessage = function (event) {
      if (event.data && (event.data.action === 'deleted' || event.data.action === 'updated')) {
        const deletedIds = event.data.deletedIds || JSON.parse(localStorage.getItem('macmo_deleted_product_ids') || '[]');
        if (event.data.catalog && Array.isArray(event.data.catalog)) {
          MACMO_STORE.products = event.data.catalog.filter(p => !deletedIds.includes(p.id));
        } else if (event.data.id) {
          MACMO_STORE.products = MACMO_STORE.products.filter(p => p.id !== event.data.id && !deletedIds.includes(p.id));
        }
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof populateLaybyDeviceOptions === 'function') populateLaybyDeviceOptions();
      }
    };
  } catch (e) {}

  window.addEventListener('storage', function(e) {
    if (e.key === 'macmo_catalog_override' || e.key === 'macmo_deleted_product_ids') {
      try {
        const deletedIds = JSON.parse(localStorage.getItem('macmo_deleted_product_ids') || '[]');
        const custom = localStorage.getItem('macmo_catalog_override');
        if (custom) {
          MACMO_STORE.products = JSON.parse(custom).filter(p => !deletedIds.includes(p.id));
        } else if (typeof MACMO_STORE !== 'undefined' && Array.isArray(MACMO_STORE.products)) {
          MACMO_STORE.products = MACMO_STORE.products.filter(p => !deletedIds.includes(p.id));
        }
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof populateLaybyDeviceOptions === 'function') populateLaybyDeviceOptions();
      } catch (err) {}
    }
  });


  // Load cart from storage safely
  try {
    const savedCart = localStorage.getItem('macmo_cart');
    if (savedCart) {
      cart = JSON.parse(savedCart);
    }
  } catch (e) {
    cart = [];
  }

  // Load wishlist from storage safely
  try {
    const savedWish = localStorage.getItem('macmo_wishlist');
    if (savedWish) {
      wishlist = JSON.parse(savedWish);
    }
  } catch (e) {
    wishlist = [];
  }

  // 2. DOM ELEMENTS
  const sitePreloader = document.getElementById('sitePreloader');
  const scrollProgressBar = document.getElementById('scrollProgressBar');
  const siteHeader = document.getElementById('siteHeader');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const mobileThemeToggleBtn = document.getElementById('mobileThemeToggleBtn');
  const mobileThemeStatus = document.getElementById('mobileThemeStatus');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');

  const productsGrid = document.getElementById('productsGrid');
  const catalogSearchInput = document.getElementById('catalogSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const catalogSortSelect = document.getElementById('catalogSortSelect');
  const catalogLiveCount = document.getElementById('catalogLiveCount');
  const catPills = document.querySelectorAll('.cat-pill');

  // Specs Modal
  const specsModal = document.getElementById('specsModal');
  const specsModalCloseBtn = document.getElementById('specsModalCloseBtn');
  const modalDeviceImg = document.getElementById('modalDeviceImg');
  const modalDeviceBrand = document.getElementById('modalDeviceBrand');
  const modalDeviceTitle = document.getElementById('modalDeviceTitle');
  const modalDevicePrice = document.getElementById('modalDevicePrice');
  const modalDeviceSpecs = document.getElementById('modalDeviceSpecs');
  const modalDeviceDesc = document.getElementById('modalDeviceDesc');
  const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');
  const modalOrderWaBtn = document.getElementById('modalOrderWaBtn');

  // Cart Drawer
  const cartDrawer = document.getElementById('cart-drawer');
  const cartDrawerOverlay = document.getElementById('cart-drawer-overlay');
  const cartBtn = document.getElementById('cart-btn');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  const cartItemsList = document.getElementById('cart-items-list');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartCountBadge = document.getElementById('cart-count-badge');
  const mBarCartBadge = document.getElementById('m-bar-cart-badge');
  const drawerItemCount = document.getElementById('drawer-item-count');
  const checkoutWaBtn = document.getElementById('checkout-wa-btn');

  // Wishlist Drawer & Badge
  const wishlistDrawer = document.getElementById('wishlist-drawer');
  const wishlistDrawerOverlay = document.getElementById('wishlist-drawer-overlay');
  const wishlistBtn = document.getElementById('wishlist-btn');
  const wishCountBadge = document.getElementById('wish-count-badge');
  const wishlistItemsList = document.getElementById('wishlist-items-list');
  const wishlistSubtotal = document.getElementById('wishlist-subtotal');
  const wishlistItemCount = document.getElementById('wishlist-item-count');

  // Search Modal
  const searchModalOverlay = document.getElementById('search-modal-overlay');
  const searchBtn = document.getElementById('search-btn');
  const searchCloseBtn = document.getElementById('search-close-btn');
  const modalSearchInput = document.getElementById('modal-search-input');
  const searchModalResults = document.getElementById('search-modal-results');

  // Trade In
  const tradeBrandSelect = document.getElementById('trade-brand');
  const tradeModelSelect = document.getElementById('trade-model');
  const tradeCondSelect = document.getElementById('trade-condition');
  const tradeTargetSelect = document.getElementById('trade-target');
  const tradeCreditVal = document.getElementById('trade-credit-val');
  const tradeDiffVal = document.getElementById('trade-diff-val');
  const bookTradeInBtn = document.getElementById('book-trade-in-btn');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // 3. INITIALIZATION
  function init() {
    initPreloader();
    initScrollProgress();
    initTheme();
    initStickyHeader();
    initMobileNav();
    initCatalog();
    initSpecsModal();
    initCart();
    initWishlist();
    initLiveSearch();
    initTradeIn();
    initMobileBottomBar();
    updateCartUI();
    updateWishlistUI();
  }

  // PRELOADER
  function initPreloader() {
    if (!sitePreloader) return;
    const hidePreloader = () => {
      sitePreloader.classList.add('hidden');
      setTimeout(() => {
        sitePreloader.style.display = 'none';
      }, 550);
    };

    if (document.readyState === 'complete') {
      setTimeout(hidePreloader, 350);
    } else {
      window.addEventListener('load', () => setTimeout(hidePreloader, 350));
      setTimeout(hidePreloader, 1200);
    }
  }

  // SCROLL PROGRESS BAR
  function initScrollProgress() {
    if (!scrollProgressBar) return;
    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      scrollProgressBar.style.width = scrolled + '%';
    }, { passive: true });
  }

  // THEME LOCK (PERMANENT SINGLE LUXURY LIGHT PALETTE)
  function initTheme() {
    document.documentElement.setAttribute('data-theme', 'light');
    try {
      localStorage.setItem('macmo_theme', 'light');
    } catch(e) {}
    if (themeToggleBtn) themeToggleBtn.style.display = 'none';
    if (mobileThemeToggleBtn) mobileThemeToggleBtn.style.display = 'none';
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', 'light');
  }


  // STICKY HEADER
  function initStickyHeader() {
    if (!siteHeader) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 35) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // MOBILE NAVIGATION DRAWER
  function initMobileNav() {
    window.closeMobileNav = () => {
      if (mobileNavDrawer) {
        mobileNavDrawer.classList.remove('open');
        mobileNavDrawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    };
    if (!mobileMenuBtn || !mobileNavDrawer) return;

    const openDrawer = () => {
      mobileNavDrawer.classList.add('open');
      mobileNavDrawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      mobileNavDrawer.classList.remove('open');
      mobileNavDrawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    mobileMenuBtn.addEventListener('click', () => {
      if (mobileNavDrawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    const closeBtn = mobileNavDrawer.querySelector('.drawer-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    const overlay = mobileNavDrawer.querySelector('.drawer-overlay');
    if (overlay) overlay.addEventListener('click', closeDrawer);

    const drawerLinks = mobileNavDrawer.querySelectorAll('a');
    drawerLinks.forEach(link => {
      link.addEventListener('click', closeDrawer);
    });
  }

  // 4. CATALOG SYSTEM
  function initCatalog() {
    const filterTabBtns = document.querySelectorAll('.filter-tab-btn, .cat-pill');
    filterTabBtns.forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = pill.getAttribute('data-category') || 'all';
        window.filterByCat(cat);
      });
    });

    if (catalogSearchInput) {
      catalogSearchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
        }
        renderProducts();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (catalogSearchInput) catalogSearchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderProducts();
      });
    }

    if (catalogSortSelect) {
      catalogSortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
      });
    }

    renderProducts();
  }

  function getFilteredProducts() {
    if (typeof MACMO_STORE === 'undefined' || !Array.isArray(MACMO_STORE.products)) {
      return [];
    }
    let list = [...MACMO_STORE.products];

    // Guarantee any deleted item is excluded
    try {
      const deletedIds = JSON.parse(localStorage.getItem('macmo_deleted_product_ids') || '[]');
      if (Array.isArray(deletedIds) && deletedIds.length > 0) {
        list = list.filter(p => !deletedIds.includes(p.id));
      }
    } catch (e) {}

    // Filter by Category
    if (currentCategory !== 'all') {
      list = list.filter(p => p.category === currentCategory);
    }

    // Filter by Search
    if (searchQuery) {
      list = list.filter(p => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const specs = (p.specs || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(searchQuery) || brand.includes(searchQuery) || specs.includes(searchQuery) || desc.includes(searchQuery);
      });
    }

    // Sort
    if (currentSort === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (currentSort === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (currentSort === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }

  window.renderCatalog = function() { renderProducts(); };
  function renderProducts() {
    if (!productsGrid) return;
    const items = getFilteredProducts();

    if (catalogLiveCount) {
      const catNames = {
        'all': 'All Products',
        'phones': 'Smartphones',
        'gaming': 'PlayStation & Gaming',
        'computers': 'Laptops',
        'tablets': 'iPads & Tablets',
        'audio': 'Audio & Speakers',
        'wearables': 'Smartwatches & Wearables',
        'power': 'Power & Load-Shedding',
        'accessories': 'Accessories & Gear'
      };
      const catLabel = catNames[currentCategory] || currentCategory;
      if (currentCategory === 'all') {
        catalogLiveCount.textContent = `Showing all ${items.length} devices in stock`;
      } else {
        catalogLiveCount.textContent = `Showing ${items.length} ${items.length === 1 ? 'device' : 'devices'} in ${catLabel}`;
      }
    }

    if (items.length === 0) {
      productsGrid.innerHTML = `
        <div class="empty-catalog-box">
          <i class="fa-solid fa-magnifying-glass empty-icon"></i>
          <h4>No matching tech products found</h4>
          <p>Try clearing filters or search for another model like iPhone, PS5, Laptop, or Power Station.</p>
          <button class="btn-primary-tech" onclick="window.resetCatalogFilters()">View All Products</button>
        </div>
      `;
      return;
    }

    productsGrid.innerHTML = items.map(p => {
      const badgeClass = getBadgeClass(p.badge);
      const formattedPrice = p.priceFormatted || `K ${Number(p.price).toLocaleString()}`;
      const specsSnippet = p.specs ? p.specs.split('•')[0].trim() : 'Official MacMo Warranty';
      const isWishlisted = wishlist.includes(p.id);

      const laybyDep = Math.round((Number(p.price) || 0) * 0.2);

      const isSoldOut = p.stock && p.stock.toLowerCase().includes('sold out');
      const displayBadge = isSoldOut ? 'Sold Out' : (p.badge || 'In Stock');
      const finalBadgeClass = isSoldOut ? 'badge-soldout-pill' : badgeClass;

      return `
        <article class="product-card ${isSoldOut ? 'is-sold-out' : ''}" data-category="${p.category}" data-id="${p.id}" onclick="window.openDeviceSpecs('${p.id}')" style="cursor:pointer;">
          <div class="card-image-box">
            <span class="card-badge-pill ${finalBadgeClass}">${displayBadge}</span>
            <button type="button" class="btn-card-wish ${isWishlisted ? 'active' : ''}" onclick="window.toggleWishlist('${p.id}'); event.stopPropagation();" title="${isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}" aria-label="Toggle Wishlist">
              <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
            <img src="${p.image}" alt="${p.name}" class="card-img" loading="lazy" onerror="this.src='images/powerbank-40k.jpg'" />
          </div>
          <div class="card-body">
            <div class="card-meta-line">
              <span class="card-brand">${p.brand || 'MacMo Tech'}</span>
              <span class="card-rating"><i class="fa-solid fa-star"></i> ${p.rating || '4.9'}</span>
            </div>
            <h3 class="card-title" title="${p.name}">${p.name}</h3>
            <p class="card-specs-snippet">${specsSnippet}</p>
            <div class="card-footer">
              <div class="card-price-row">
                <span class="price-current">${formattedPrice}</span>
                <span class="card-layby-tag"><i class="fa-solid fa-box-archive"></i> Layby: K ${laybyDep.toLocaleString()} dep.</span>
              </div>
              <div class="card-btn-action-row">
                <button type="button" class="btn-card-wa-primary" style="background: var(--brand-gradient); box-shadow: 0 4px 12px rgba(10, 112, 185, 0.22);" onclick="window.openDeviceSpecs('${p.id}'); event.stopPropagation();" title="Select Options & Buy">
                  <i class="fa-solid fa-bag-shopping"></i> View &amp; Buy
                </button>
                <button type="button" class="btn-card-specs-subtle" onclick="window.addToCart('${p.id}', 1); event.stopPropagation();" title="Quick Add to Basket">
                  <i class="fa-solid fa-plus"></i> Basket
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function getBadgeClass(badge) {
    if (!badge) return 'badge-default';
    const b = badge.toLowerCase();
    if (b.includes('flagship') || b.includes('pro')) return 'badge-gold';
    if (b.includes('power') || b.includes('ups') || b.includes('charge')) return 'badge-emerald';
    if (b.includes('campus') || b.includes('pick') || b.includes('study')) return 'badge-sapphire';
    return 'badge-primary';
  }

  window.filterByCat = function (category) {
    currentCategory = category || 'all';
    searchQuery = '';
    if (catalogSearchInput) catalogSearchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';

    const filterTabs = document.querySelectorAll('.filter-tab-btn, .cat-pill');
    filterTabs.forEach(p => {
      const match = p.getAttribute('data-category') === currentCategory;
      p.classList.toggle('active', match);
    });

    renderProducts();

    const storeEl = document.getElementById('store');
    if (storeEl) {
      const rect = storeEl.getBoundingClientRect();
      if (rect.top < -50 || rect.top > window.innerHeight) {
        storeEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  window.resetCatalogFilters = function () {
    window.filterByCat('all');
  };

  // 5. INTERACTIVE PRODUCT DETAIL & CONFIGURATION MODAL (PDP)
  let modalSelectedStorage = '256GB';
  let modalSelectedColor = 'Black Titanium';
  let modalQty = 1;
  let modalUnitPrice = 0;

  function getStorageOptionsForProduct(p) {
    const cat = (p.category || '').toLowerCase();
    const base = Number(p.price) || 0;
    if (cat === 'phones' || cat === 'tablets') {
      const defStorage = (p.name && p.name.includes('128GB')) ? '128GB' : '256GB';
      return [
        { label: '128GB', delta: defStorage === '128GB' ? 0 : -1500 },
        { label: '256GB', delta: defStorage === '256GB' ? 0 : 1500 },
        { label: '512GB', delta: 3500 },
        { label: '1TB', delta: 6000 },
        { label: 'Dual SIM / eSIM', delta: 0, isTag: true }
      ].filter(o => base + o.delta > 500);
    }
    if (cat === 'computers') {
      return [
        { label: '256GB SSD', delta: -2000 },
        { label: '512GB SSD', delta: 0 },
        { label: '1TB SSD', delta: 3500 },
        { label: '16GB Unified RAM', delta: 0, isTag: true }
      ];
    }
    if (cat === 'gaming') {
      return [
        { label: '1TB Standard Console', delta: 0 },
        { label: '2-Controller Bundle', delta: 1450 },
        { label: 'Pro Gaming Pack (+FC25)', delta: 2400 }
      ];
    }
    return [
      { label: 'Standard Retail Pack', delta: 0 },
      { label: '2-Unit Twin Pack (Save 5%)', delta: Math.round(base * 0.9) }
    ];
  }

  function getColorOptionsForProduct(p) {
    const cat = (p.category || '').toLowerCase();
    if (cat === 'phones' || cat === 'tablets' || cat === 'computers' || cat === 'wearables') {
      return [
        { name: 'Black Titanium', hex: '#141619' },
        { name: 'Ocean Blue', hex: '#2563eb' },
        { name: 'Deep Burgundy', hex: '#5c1922' },
        { name: 'Natural Silver', hex: '#d4d4d8' }
      ];
    }
    return [
      { name: 'Signature Black', hex: '#141619' },
      { name: 'Glacier White', hex: '#e2e8f0' },
      { name: 'Cobalt Blue', hex: '#1d4ed8' }
    ];
  }

  function initSpecsModal() {
    if (!specsModal) return;

    if (specsModalCloseBtn) {
      specsModalCloseBtn.addEventListener('click', closeDeviceSpecs);
    }

    specsModal.addEventListener('click', (e) => {
      if (e.target === specsModal) {
        closeDeviceSpecs();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (specsModal && specsModal.style.display !== 'none') closeDeviceSpecs();
        const chkModal = document.getElementById('checkoutModal');
        if (chkModal && chkModal.style.display !== 'none') window.closeCheckoutModal();
        if (cartDrawer && cartDrawer.classList.contains('open')) closeCart();
        if (wishlistDrawer && wishlistDrawer.classList.contains('open')) window.closeWishlistModal();
        if (searchModalOverlay && searchModalOverlay.classList.contains('active')) closeSearch();
      }
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        openSearch();
      }
    });

    if (modalAddToCartBtn) {
      modalAddToCartBtn.addEventListener('click', () => {
        if (activeModalProductId) {
          window.addToCart(activeModalProductId, modalQty, {
            storage: modalSelectedStorage,
            color: modalSelectedColor,
            price: modalUnitPrice
          });
          closeDeviceSpecs();
          openCart();
        }
      });
    }
  }

  function formatKwacha(val) {
    const num = Number(val) || 0;
    return 'K ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function refreshModalPriceDisplay() {
    const totalForBtn = modalUnitPrice * modalQty;
    const laybyDep = Math.round(modalUnitPrice * 0.20);
    if (modalDevicePrice) modalDevicePrice.textContent = formatKwacha(modalUnitPrice);
    const btnPriceEl = document.getElementById('modalAddBtnPrice');
    if (btnPriceEl) btnPriceEl.textContent = formatKwacha(totalForBtn);
    const laybyHintEl = document.getElementById('modalLaybyHint');
    if (laybyHintEl) {
      laybyHintEl.innerHTML = `<i class="fa-solid fa-box-archive"></i> 0% Layby from ${formatKwacha(laybyDep)} deposit`;
    }
    const qtyEl = document.getElementById('modalQtyValue');
    if (qtyEl) qtyEl.textContent = modalQty;
  }

  window.adjustModalQty = function (delta) {
    modalQty = Math.max(1, modalQty + delta);
    refreshModalPriceDisplay();
  };

  window.selectModalStorage = function (label, delta, btnEl) {
    if (!activeModalProductId) return;
    const p = (MACMO_STORE.products || []).find(item => item.id === activeModalProductId);
    if (!p) return;
    modalSelectedStorage = label;
    modalUnitPrice = Math.max(100, (Number(p.price) || 0) + (Number(delta) || 0));

    const container = document.getElementById('modalStoragePills');
    if (container) {
      container.querySelectorAll('.pdp-storage-pill').forEach(b => b.classList.remove('active'));
    }
    if (btnEl) btnEl.classList.add('active');
    refreshModalPriceDisplay();
  };

  window.selectModalColor = function (colorName, btnEl) {
    modalSelectedColor = colorName;
    const lbl = document.getElementById('modalSelectedColorName');
    if (lbl) lbl.textContent = colorName;
    const container = document.getElementById('modalColorSwatches');
    if (container) {
      container.querySelectorAll('.pdp-color-swatch').forEach(b => b.classList.remove('active'));
    }
    if (btnEl) btnEl.classList.add('active');
  };

  window.toggleModalWishlist = function () {
    if (!activeModalProductId) return;
    window.toggleWishlist(activeModalProductId);
    syncModalWishlistIcon();
  };

  function syncModalWishlistIcon() {
    const wishBtn = document.getElementById('modalWishBtn');
    const wishIcon = document.getElementById('modalWishIcon');
    const isSaved = activeModalProductId && wishlist.includes(activeModalProductId);
    if (wishBtn) wishBtn.classList.toggle('active', isSaved);
    if (wishIcon) {
      wishIcon.className = isSaved ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }
  }

  window.openDeviceSpecs = function (productId) {
    if (typeof MACMO_STORE === 'undefined' || !Array.isArray(MACMO_STORE.products)) return;
    const p = MACMO_STORE.products.find(item => item.id === productId);
    if (!p || !specsModal) return;

    activeModalProductId = p.id;
    modalQty = 1;
    modalUnitPrice = Number(p.price) || 0;

    if (modalDeviceImg) {
      modalDeviceImg.src = p.image;
      modalDeviceImg.alt = p.name;
    }
    const badgeEl = document.getElementById('modalDeviceBadge');
    if (badgeEl) badgeEl.textContent = p.badge || 'Official Warranty';
    if (modalDeviceBrand) modalDeviceBrand.textContent = p.brand || 'MacMo Tech';
    if (modalDeviceTitle) modalDeviceTitle.textContent = p.name;
    if (modalDeviceSpecs) modalDeviceSpecs.textContent = p.specs || 'Certified genuine hardware with 12-Month MacMo warranty.';
    if (modalDeviceDesc) modalDeviceDesc.textContent = p.description || `${p.name} available at Shop #1 Silverest Complex Lusaka.`;

    const stockEl = document.getElementById('modalDeviceStock');
    const isSoldOut = p.stock && p.stock.toLowerCase().includes('sold out');
    if (stockEl) {
      stockEl.textContent = isSoldOut ? 'Order on Request' : 'Available';
      stockEl.style.color = isSoldOut ? '#dc2626' : '#0a70b9';
    }

    // Populate Storage Pills
    const storageOpts = getStorageOptionsForProduct(p);
    const defaultStorageOpt = storageOpts.find(o => o.delta === 0) || storageOpts[0];
    modalSelectedStorage = defaultStorageOpt ? defaultStorageOpt.label : 'Standard';
    const storageContainer = document.getElementById('modalStoragePills');
    if (storageContainer) {
      storageContainer.innerHTML = storageOpts.map((opt) => {
        const isActive = opt.label === modalSelectedStorage && !opt.isTag;
        if (opt.isTag) {
          return `<span class="pdp-storage-pill is-static-tag">${opt.label}</span>`;
        }
        return `<button type="button" class="pdp-storage-pill ${isActive ? 'active' : ''}" onclick="window.selectModalStorage('${opt.label.replace(/'/g, "\\'")}', ${opt.delta}, this)">${opt.label}</button>`;
      }).join('');
    }

    // Populate Colour Swatches
    const colorOpts = getColorOptionsForProduct(p);
    modalSelectedColor = colorOpts[0].name;
    const colorNameEl = document.getElementById('modalSelectedColorName');
    if (colorNameEl) colorNameEl.textContent = modalSelectedColor;
    const colorContainer = document.getElementById('modalColorSwatches');
    if (colorContainer) {
      colorContainer.innerHTML = colorOpts.map((c, idx) => `
        <button type="button" class="pdp-color-swatch ${idx === 0 ? 'active' : ''}" onclick="window.selectModalColor('${c.name}', this)" title="${c.name}" aria-label="${c.name}">
          <span class="swatch-inner" style="background: ${c.hex};"></span>
        </button>
      `).join('');
    }

    refreshModalPriceDisplay();
    syncModalWishlistIcon();

    specsModal.style.display = 'flex';
    specsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.requestProductQuote = function () {
    if (!activeModalProductId) return;
    const p = (MACMO_STORE.products || []).find(item => item.id === activeModalProductId);
    if (!p) return;
    const total = modalUnitPrice * modalQty;
    const laybyDep = Math.round(total * 0.20);
    const msg = `*OFFICIAL QUOTE / LAYBY INQUIRY — MACMO ELECTRONICS*\n` +
      `Device: ${p.name}\n` +
      `Selected Option: ${modalSelectedStorage} · ${modalSelectedColor}\n` +
      `Quantity: ${modalQty}\n` +
      `Unit Price: ${formatKwacha(modalUnitPrice)}\n` +
      `Total Value: ${formatKwacha(total)} (20% Layby Deposit: ${formatKwacha(laybyDep)})\n\n` +
      `Please share an official quotation or 0% Layby reservation details for this configuration.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  window.requestProductBusinessPrice = function () {
    if (!activeModalProductId) return;
    const p = (MACMO_STORE.products || []).find(item => item.id === activeModalProductId);
    if (!p) return;
    const qty = Math.max(2, modalQty);
    const msg = `*CORPORATE / BUSINESS BULK PRICE INQUIRY — MACMO ELECTRONICS*\n` +
      `Device: ${p.name}\n` +
      `Configuration: ${modalSelectedStorage} · ${modalSelectedColor}\n` +
      `Requested Quantity: ${qty}+ units\n` +
      `Listed Unit Price: ${formatKwacha(modalUnitPrice)}\n\n` +
      `Hello MacMo Corporate Desk, we are buying for a business/institution. Please share your best volume discount price and proforma invoice details.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  function closeDeviceSpecs() {
    if (!specsModal) return;
    specsModal.classList.remove('active');
    specsModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // 6. BASKET & INTERACTIVE CHECKOUT SYSTEM
  function initCart() {
    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
    if (cartDrawerOverlay) cartDrawerOverlay.addEventListener('click', closeCart);

    const mBarCartBtn = document.getElementById('m-bar-cart-btn');
    if (mBarCartBtn) mBarCartBtn.addEventListener('click', openCart);

    if (checkoutWaBtn) {
      checkoutWaBtn.addEventListener('click', () => {
        window.openCheckoutModal();
      });
    }
  }

  function openCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('open');
    if (cartDrawerOverlay) cartDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  window.openCart = openCart;

  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('open');
    if (cartDrawerOverlay) cartDrawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  window.closeCart = closeCart;

  window.addToCart = function (productId, qty = 1, variant = null) {
    if (typeof MACMO_STORE === 'undefined' || !Array.isArray(MACMO_STORE.products)) return;
    const p = MACMO_STORE.products.find(item => item.id === productId);
    if (!p) return;

    const storage = (variant && variant.storage) ? variant.storage : (p.specs ? p.specs.split('•')[0].trim() : 'Standard');
    const color = (variant && variant.color) ? variant.color : 'Original Finish';
    const itemPrice = (variant && variant.price) ? Number(variant.price) : Number(p.price);
    const cartKey = `${p.id}__${storage}__${color}`;

    const existingIndex = cart.findIndex(item => (item.cartKey || item.id) === cartKey);
    if (existingIndex > -1) {
      cart[existingIndex].qty += qty;
    } else {
      cart.push({
        cartKey: cartKey,
        id: p.id,
        name: p.name,
        price: itemPrice,
        storage: storage,
        color: color,
        image: p.image,
        qty: qty
      });
    }

    updateCartUI();
    showToast(`Added "${p.name}" to your basket`);
  };

  window.updateQty = function (cartKeyOrId, delta) {
    const itemIndex = cart.findIndex(i => (i.cartKey || i.id) === cartKeyOrId);
    if (itemIndex === -1) return;

    cart[itemIndex].qty += delta;
    if (cart[itemIndex].qty <= 0) {
      cart.splice(itemIndex, 1);
    }
    updateCartUI();
    renderCheckoutSummary();
  };

  window.removeFromCart = function (cartKeyOrId) {
    cart = cart.filter(i => (i.cartKey || i.id) !== cartKeyOrId);
    updateCartUI();
    renderCheckoutSummary();
    showToast('Removed item from basket');
  };

  function updateCartUI() {
    try {
      localStorage.setItem('macmo_cart', JSON.stringify(cart));
    } catch (e) {}

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    if (cartCountBadge) {
      cartCountBadge.textContent = totalQty;
      cartCountBadge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    }
    if (mBarCartBadge) {
      mBarCartBadge.textContent = totalQty;
      mBarCartBadge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    }
    if (drawerItemCount) {
      drawerItemCount.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'items'}`;
    }
    const headerCartLbl = document.getElementById('header-cart-total-label');
    if (headerCartLbl) {
      headerCartLbl.textContent = totalQty > 0 ? `K ${subtotal.toLocaleString()}` : 'Order Now';
    }
    if (cartSubtotal) {
      cartSubtotal.textContent = formatKwacha(subtotal);
    }

    if (!cartItemsList) return;

    if (cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="empty-cart-view">
          <i class="fa-solid fa-bag-shopping empty-cart-icon"></i>
          <h4>Your basket is currently empty</h4>
          <p>Tap any smartphone, laptop, PlayStation console, or power station to configure and add to your basket.</p>
        </div>
      `;
      if (checkoutWaBtn) {
        checkoutWaBtn.disabled = true;
        checkoutWaBtn.style.opacity = '0.5';
        checkoutWaBtn.style.pointerEvents = 'none';
      }
      return;
    }

    if (checkoutWaBtn) {
      checkoutWaBtn.disabled = false;
      checkoutWaBtn.style.opacity = '1';
      checkoutWaBtn.style.pointerEvents = 'auto';
    }

    cartItemsList.innerHTML = cart.map(item => {
      const key = item.cartKey || item.id;
      const metaVariant = [item.storage, item.color].filter(Boolean).join(' · ');
      return `
        <div class="basket-item-row" data-id="${key}">
          <div class="basket-thumb-box">
            <img src="${item.image}" alt="${item.name}" class="basket-thumb-img" onerror="this.src='images/powerbank-40k.jpg'" />
          </div>
          <div class="basket-item-main">
            <div class="basket-item-top">
              <div>
                <h4 class="basket-item-title">${item.name}</h4>
                <div class="basket-item-meta">${metaVariant ? metaVariant + ' · ' : ''}${formatKwacha(item.price)}</div>
              </div>
              <button type="button" class="basket-remove-link" onclick="window.removeFromCart('${key.replace(/'/g, "\\'")}')">Remove</button>
            </div>
            <div class="basket-qty-pill">
              <button type="button" class="basket-qty-btn" onclick="window.updateQty('${key.replace(/'/g, "\\'")}', -1)" aria-label="Decrease quantity">&minus;</button>
              <span class="basket-qty-num">${item.qty}</span>
              <button type="button" class="basket-qty-btn" onclick="window.updateQty('${key.replace(/'/g, "\\'")}', 1)" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.requestBasketBusinessQuote = function () {
    if (cart.length === 0) {
      showToast('Add at least one device to your basket first');
      return;
    }
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let msg = `*CORPORATE / BUSINESS BASKET QUOTE — MACMO ELECTRONICS*\n`;
    msg += `Shop #1 Silverest Complex, Lusaka\n`;
    msg += `------------------------------------\n`;
    cart.forEach(item => {
      const v = [item.storage, item.color].filter(Boolean).join(' · ');
      msg += `• ${item.qty}x ${item.name} (${v}) @ ${formatKwacha(item.price)}\n`;
    });
    msg += `------------------------------------\n`;
    msg += `*LISTED TOTAL: ${formatKwacha(subtotal)}*\n\n`;
    msg += `Please provide your best corporate/bulk price and official quotation for these items.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  // 6C. DEDICATED INTERACTIVE CHECKOUT VIEW ("ALMOST DONE")
  let checkoutDeliveryMethod = 'deliver';
  let checkoutOutsideLusaka = false;
  let checkoutPaymentMethod = 'Mobile Money (Airtel / MTN)';

  window.openCheckoutModal = function () {
    if (cart.length === 0) return;
    closeCart();
    const chkModal = document.getElementById('checkoutModal');
    if (!chkModal) return;

    // Auto-fill remembered customer info if available
    try {
      const savedCust = JSON.parse(localStorage.getItem('macmo_customer_profile') || '{}');
      const nameEl = document.getElementById('chkFullName');
      const phoneEl = document.getElementById('chkPhone');
      const emailEl = document.getElementById('chkEmail');
      const addrEl = document.getElementById('chkAddress');
      if (nameEl && savedCust.name && !nameEl.value) nameEl.value = savedCust.name;
      if (phoneEl && savedCust.phone && !phoneEl.value) phoneEl.value = savedCust.phone;
      if (emailEl && savedCust.email && !emailEl.value) emailEl.value = savedCust.email;
      if (addrEl && savedCust.address && !addrEl.value) addrEl.value = savedCust.address;
    } catch (e) {}

    renderCheckoutSummary();
    chkModal.style.display = 'flex';
    chkModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeCheckoutModal = function () {
    const chkModal = document.getElementById('checkoutModal');
    if (!chkModal) return;
    chkModal.classList.remove('active');
    chkModal.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.backToBasketFromCheckout = function () {
    window.closeCheckoutModal();
    openCart();
  };

  window.setCheckoutDeliveryMethod = function (method) {
    checkoutDeliveryMethod = method === 'collect' ? 'collect' : 'deliver';
    const btnDeliv = document.getElementById('chkMethodDeliver');
    const btnCollect = document.getElementById('chkMethodCollect');
    const addrWrap = document.getElementById('chkAddressWrapper');
    if (btnDeliv) btnDeliv.classList.toggle('active', checkoutDeliveryMethod === 'deliver');
    if (btnCollect) btnCollect.classList.toggle('active', checkoutDeliveryMethod === 'collect');
    if (addrWrap) addrWrap.style.display = checkoutDeliveryMethod === 'deliver' ? 'block' : 'none';
  };

  window.toggleCheckoutOutOfLusaka = function () {
    checkoutOutsideLusaka = !checkoutOutsideLusaka;
    const cityLbl = document.getElementById('chkCityLabel');
    const toggleBtn = document.getElementById('chkCityToggleBtn');
    const townWrap = document.getElementById('chkTownWrapper');
    if (cityLbl) cityLbl.textContent = checkoutOutsideLusaka ? 'Nationwide Courier (1–3 days)' : 'Lusaka';
    if (toggleBtn) toggleBtn.textContent = checkoutOutsideLusaka ? 'switch back to Lusaka?' : 'not Lusaka?';
    if (townWrap) townWrap.style.display = checkoutOutsideLusaka ? 'block' : 'none';
  };

  window.setCheckoutPayment = function (btnEl) {
    if (!btnEl) return;
    checkoutPaymentMethod = btnEl.getAttribute('data-pay') || 'Mobile Money (Airtel / MTN)';
    document.querySelectorAll('.chk-pay-pill').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    renderCheckoutSummary();
  };

  function renderCheckoutSummary() {
    const countEl = document.getElementById('chkSummaryCount');
    const itemsEl = document.getElementById('chkSummaryItems');
    const subEl = document.getElementById('chkSubtotalVal');
    const grandEl = document.getElementById('chkGrandTotalVal');
    const btnAmtEl = document.getElementById('chkPlaceOrderBtnAmt');
    const laybyRow = document.getElementById('chkLaybyDepositRow');
    const laybyVal = document.getElementById('chkLaybyDepositVal');

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const isLayby = checkoutPaymentMethod.toLowerCase().includes('layby');
    const laybyDeposit = Math.round(subtotal * 0.20);

    if (countEl) countEl.textContent = `${totalQty} ${totalQty === 1 ? 'item' : 'items'}`;
    if (subEl) subEl.textContent = formatKwacha(subtotal);
    if (grandEl) grandEl.textContent = formatKwacha(subtotal);
    if (btnAmtEl) btnAmtEl.textContent = isLayby ? `${formatKwacha(laybyDeposit)} deposit` : formatKwacha(subtotal);

    if (laybyRow && laybyVal) {
      laybyRow.style.display = isLayby ? 'flex' : 'none';
      laybyVal.textContent = formatKwacha(laybyDeposit);
    }

    if (itemsEl) {
      itemsEl.innerHTML = cart.map(item => {
        const meta = [item.storage, item.color].filter(Boolean).join(' · ');
        const lineTotal = item.price * item.qty;
        return `
          <div class="chk-summary-item">
            <img src="${item.image}" alt="${item.name}" class="chk-summary-thumb" onerror="this.src='images/powerbank-40k.jpg'" />
            <div class="chk-summary-info">
              <div class="chk-summary-name">${item.name}</div>
              <div class="chk-summary-meta">${meta ? meta + ' · ' : ''}${item.qty} &times; ${formatKwacha(item.price)}</div>
            </div>
            <div class="chk-summary-price">${formatKwacha(lineTotal)}</div>
          </div>
        `;
      }).join('');
    }
  }

  window.submitFinalCheckout = function (e) {
    if (e) e.preventDefault();
    if (cart.length === 0) return;

    const name = (document.getElementById('chkFullName')?.value || '').trim();
    const phone = (document.getElementById('chkPhone')?.value || '').trim();
    const email = (document.getElementById('chkEmail')?.value || '').trim();
    const address = (document.getElementById('chkAddress')?.value || '').trim();
    const town = (document.getElementById('chkTownInput')?.value || '').trim();

    if (!name || !phone) {
      showToast('Please enter your Full Name and Phone / WhatsApp number');
      return;
    }
    if (checkoutDeliveryMethod === 'deliver' && !address) {
      showToast('Please enter your delivery area, hostel, or street directions');
      document.getElementById('chkAddress')?.focus();
      return;
    }

    // Save customer profile for next time
    try {
      localStorage.setItem('macmo_customer_profile', JSON.stringify({ name, phone, email, address }));
    } catch (err) {}

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const orderRef = 'MM-' + Math.floor(1000 + Math.random() * 9000);
    const isLayby = checkoutPaymentMethod.toLowerCase().includes('layby');
    const laybyDeposit = Math.round(subtotal * 0.20);

    let deliveryDesc = 'Collect in Store — Shop #1, Silverest Complex (Opp. UNILUS)';
    if (checkoutDeliveryMethod === 'deliver') {
      const cityPart = checkoutOutsideLusaka ? (town || 'Outside Lusaka (Courier)') : 'Lusaka';
      deliveryDesc = `Deliver to me (${cityPart}) — ${address}`;
    }

    let message = `*ORDER CONFIRMATION (${orderRef}) — MACMO ELECTRONICS*\n`;
    message += `------------------------------------\n`;
    message += `*Customer:* ${name}\n`;
    message += `*Phone/WhatsApp:* ${phone}\n`;
    if (email) message += `*Email/Receipt:* ${email}\n`;
    message += `*Fulfilment:* ${deliveryDesc}\n`;
    message += `*Payment Method:* ${checkoutPaymentMethod}\n`;
    message += `------------------------------------\n`;
    message += `*ITEMS ORDERED:*\n`;
    cart.forEach(item => {
      const v = [item.storage, item.color].filter(Boolean).join(' · ');
      message += `• ${item.qty}x ${item.name} (${v}) = ${formatKwacha(item.price * item.qty)}\n`;
    });
    message += `------------------------------------\n`;
    message += `*TOTAL TO PAY: ${formatKwacha(subtotal)}*\n`;
    if (isLayby) {
      message += `*20% LAYBY DEPOSIT DUE TODAY: ${formatKwacha(laybyDeposit)}*\n`;
    }
    message += `\nPlease confirm dispatch & receipt for Order ${orderRef}.`;

    window.closeCheckoutModal();
    showToast(`Order ${orderRef} prepared! Confirming on WhatsApp...`);
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  };

  window.buyDirectWA = function (productId) {
    if (typeof MACMO_STORE === 'undefined' || !Array.isArray(MACMO_STORE.products)) return;
    const p = MACMO_STORE.products.find(item => item.id === productId);
    if (!p) return;

    const msg = `*DIRECT BUY INQUIRY — MACMO ELECTRONICS*\n` +
      `Product: ${p.name}\n` +
      `Price: ${p.priceFormatted || 'K ' + Number(p.price).toLocaleString()}\n` +
      `Store: Shop #1 Silverest Complex Lusaka (Opposite UNILUS)\n\n` +
      `I would like to order this device today. Please send payment/reservation details.`;

    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener');
  };

  // 6B. WISHLIST SYSTEM
  function initWishlist() {
    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', window.showWishlistModal);
    }
  }

  window.showWishlistModal = function () {
    if (!wishlistDrawer) return;
    wishlistDrawer.classList.add('open');
    if (wishlistDrawerOverlay) wishlistDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateWishlistUI();
  };

  window.closeWishlistModal = function () {
    if (!wishlistDrawer) return;
    wishlistDrawer.classList.remove('open');
    if (wishlistDrawerOverlay) wishlistDrawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.toggleWishlist = function (productId) {
    const idx = wishlist.indexOf(productId);
    if (idx > -1) {
      wishlist.splice(idx, 1);
      showToast('Removed device from your wishlist');
    } else {
      wishlist.push(productId);
      showToast('Saved device to your wishlist');
    }

    try {
      localStorage.setItem('macmo_wishlist', JSON.stringify(wishlist));
    } catch (e) {}

    updateWishlistUI();
    renderProducts(); // Refresh heart states on cards
  };

  window.removeFromWishlist = function (productId) {
    wishlist = wishlist.filter(id => id !== productId);
    try {
      localStorage.setItem('macmo_wishlist', JSON.stringify(wishlist));
    } catch (e) {}
    updateWishlistUI();
    renderProducts();
    showToast('Removed from wishlist');
  };

  window.moveToCart = function (productId) {
    window.addToCart(productId);
    window.removeFromWishlist(productId);
  };

  window.inquireWishlistWA = function () {
    if (wishlist.length === 0) return;
    const items = MACMO_STORE.products.filter(p => wishlist.includes(p.id));
    const totalVal = items.reduce((sum, p) => sum + Number(p.price), 0);

    let message = `*WISHLIST INQUIRY — MACMO ELECTRONICS (LUSAKA)*\n`;
    message += `Shop #1 Silverest Complex (Opp UNILUS)\n`;
    message += `------------------------------------\n`;
    items.forEach(p => {
      message += `• ${p.name} - ${p.priceFormatted || 'K ' + Number(p.price).toLocaleString()}\n`;
    });
    message += `------------------------------------\n`;
    message += `*TOTAL VALUE: K ${totalVal.toLocaleString()}*\n\n`;
    message += `Are these devices currently in stock for pickup at Silverest or campus delivery?`;

    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  };

  function updateWishlistUI() {
    if (wishCountBadge) {
      wishCountBadge.textContent = wishlist.length;
      wishCountBadge.style.display = wishlist.length > 0 ? 'inline-flex' : 'none';
    }
    if (wishlistItemCount) {
      wishlistItemCount.textContent = `${wishlist.length} ${wishlist.length === 1 ? 'item' : 'items'}`;
    }

    if (!wishlistItemsList) return;

    if (wishlist.length === 0) {
      wishlistItemsList.innerHTML = `
        <div class="empty-cart-view">
          <i class="fa-regular fa-heart empty-cart-icon"></i>
          <h4>Your wishlist is empty</h4>
          <p>Tap the heart icon on any smartphone, console, or laptop to save it for later.</p>
        </div>
      `;
      if (wishlistSubtotal) wishlistSubtotal.textContent = 'K 0.00';
      return;
    }

    const items = (MACMO_STORE.products || []).filter(p => wishlist.includes(p.id));
    const total = items.reduce((sum, p) => sum + Number(p.price), 0);

    if (wishlistSubtotal) {
      wishlistSubtotal.textContent = `K ${total.toLocaleString()}`;
    }

    wishlistItemsList.innerHTML = items.map(p => `
      <div class="cart-item-row" data-id="${p.id}">
        <img src="${p.image}" alt="${p.name}" class="cart-item-img" onerror="this.src='images/powerbank-40k.jpg'" />
        <div class="cart-item-info">
          <h4 class="cart-item-title">${p.name}</h4>
          <span class="cart-item-price">${p.priceFormatted || 'K ' + Number(p.price).toLocaleString()}</span>
          <div class="cart-item-actions" style="margin-top: 8px;">
            <button type="button" class="btn-move-to-cart" onclick="window.moveToCart('${p.id}')">
              <i class="fa-solid fa-bag-shopping"></i> Move to Bag
            </button>
            <button type="button" class="btn-remove-item" onclick="window.removeFromWishlist('${p.id}')" title="Remove from Wishlist">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 7. LIVE SEARCH MODAL
  function initLiveSearch() {
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    const mBarSearchBtn = document.getElementById('m-bar-search-btn');
    if (mBarSearchBtn) mBarSearchBtn.addEventListener('click', openSearch);

    if (searchCloseBtn) searchCloseBtn.addEventListener('click', closeSearch);

    if (searchModalOverlay) {
      searchModalOverlay.addEventListener('click', (e) => {
        if (e.target === searchModalOverlay) closeSearch();
      });
    }

    if (modalSearchInput) {
      modalSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        renderLiveSearchResults(query);
      });
    }
  }

  function openSearch() {
    if (!searchModalOverlay) return;
    searchModalOverlay.classList.add('active');
    searchModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (modalSearchInput) {
        modalSearchInput.value = '';
        modalSearchInput.focus();
        renderLiveSearchResults('');
      }
    }, 150);
  }

  function closeSearch() {
    if (!searchModalOverlay) return;
    searchModalOverlay.classList.remove('active');
    searchModalOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  function renderLiveSearchResults(query) {
    if (!searchModalResults) return;
    if (typeof MACMO_STORE === 'undefined' || !Array.isArray(MACMO_STORE.products)) return;

    let results = MACMO_STORE.products;
    if (query) {
      results = results.filter(p => {
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const specs = (p.specs || '').toLowerCase();
        return name.includes(query) || brand.includes(query) || specs.includes(query);
      });
    } else {
      results = results.slice(0, 6);
    }

    if (results.length === 0) {
      searchModalResults.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <p>No electronics found for "${query}". Try searching for iPhone, PS5, MacBook, or Oraimo.</p>
        </div>
      `;
      return;
    }

    searchModalResults.innerHTML = results.map(p => `
      <div class="search-result-item" onclick="window.openDeviceSpecs('${p.id}'); window.closeSearchModal();">
        <img src="${p.image}" alt="${p.name}" class="search-result-img" onerror="this.src='images/powerbank-40k.jpg'" />
        <div class="search-result-info">
          <span class="search-result-title">${p.name}</span>
          <span class="search-result-brand">${p.brand || 'MacMo Flagship'} • ${p.category}</span>
          <span class="search-result-price">${p.priceFormatted || 'K ' + Number(p.price).toLocaleString()}</span>
        </div>
        <button type="button" class="btn-card-info" style="position: static; width: 32px; height: 32px;" title="View Specs">
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `).join('');
  }

  window.closeSearchModal = closeSearch;

  // 8. TRADE-IN & LAYBY SERVICE ENGINE
  let laybyDepositRate = 0.20;
  let laybyDurationMonths = 2;

  // Global tab switcher
  window.switchServiceTab = function(tabName) {
    const btnTradeIn = document.getElementById('btnServiceTradeIn');
    const btnLayby = document.getElementById('btnServiceLayby');
    const viewTradeIn = document.getElementById('service-view-tradein');
    const viewLayby = document.getElementById('service-view-layby');

    if (tabName === 'layby') {
      if (btnTradeIn) btnTradeIn.classList.remove('active');
      if (btnLayby) btnLayby.classList.add('active');
      if (viewTradeIn) viewTradeIn.style.display = 'none';
      if (viewLayby) {
        viewLayby.style.display = 'block';
        if (window.calculateLayby) window.calculateLayby();
      }
    } else {
      if (btnTradeIn) btnTradeIn.classList.add('active');
      if (btnLayby) btnLayby.classList.remove('active');
      if (viewTradeIn) {
        viewTradeIn.style.display = 'block';
        if (window.calculateTradeIn) window.calculateTradeIn();
      }
      if (viewLayby) viewLayby.style.display = 'none';
    }
  };

  // Trade-In Dropdowns & Math
  function populateTradeTargets() {
    const select = document.getElementById('trade-target');
    if (!select) return;

    let targets = [];
    if (typeof MACMO_STORE !== 'undefined' && MACMO_STORE.upgradeTargets && MACMO_STORE.upgradeTargets.length > 0) {
      targets = MACMO_STORE.upgradeTargets;
    } else if (typeof MACMO_STORE !== 'undefined' && MACMO_STORE.products && MACMO_STORE.products.length > 0) {
      targets = MACMO_STORE.products.map(p => ({
        id: p.id,
        name: `${p.name} (K ${Number(p.price).toLocaleString()})`,
        price: p.price
      }));
    }

    if (targets.length === 0) return;

    select.innerHTML = targets.map((t, idx) => `
      <option value="${t.id}" data-price="${t.price}" ${idx === 0 ? 'selected' : ''}>${t.name}</option>
    `).join('');
  }

  function populateTradeModels() {
    const brandSelect = document.getElementById('trade-brand');
    const modelSelect = document.getElementById('trade-model');
    if (!brandSelect || !modelSelect) return;

    const brand = brandSelect.value;
    let models = [];

    if (typeof MACMO_STORE !== 'undefined' && MACMO_STORE.tradeInCatalog && MACMO_STORE.tradeInCatalog[brand]) {
      models = MACMO_STORE.tradeInCatalog[brand];
    } else {
      models = [
        { id: "custom-device", name: `${brand} Standard Device`, baseValue: 8000 }
      ];
    }

    modelSelect.innerHTML = models.map((m, idx) => `
      <option value="${m.id}" data-base="${m.baseValue}" ${idx === 0 ? 'selected' : ''}>${m.name} (~K ${Number(m.baseValue).toLocaleString()})</option>
    `).join('');

    calculateTradeIn();
  }
  window.onTradeBrandChange = populateTradeModels;

  function calculateTradeIn() {
    const modelSelect = document.getElementById('trade-model');
    const condSelect = document.getElementById('trade-condition');
    const targetSelect = document.getElementById('trade-target');
    const creditVal = document.getElementById('trade-credit-val');
    const diffVal = document.getElementById('trade-diff-val');

    if (!modelSelect || !creditVal || !diffVal) return;

    const opt = modelSelect.selectedOptions[0];
    const baseVal = opt ? (parseFloat(opt.getAttribute('data-base')) || 0) : 0;
    const cond = condSelect ? condSelect.value : 'good';

    let multiplier = 0.85;
    if (cond === 'flawless') multiplier = 1.0;
    else if (cond === 'fair') multiplier = 0.65;

    const tradeCredit = Math.round(baseVal * multiplier);
    creditVal.textContent = `K ${tradeCredit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let targetPrice = 24999;
    if (targetSelect && targetSelect.selectedOptions[0]) {
      targetPrice = parseFloat(targetSelect.selectedOptions[0].getAttribute('data-price')) || 24999;
    }

    const diff = Math.max(0, targetPrice - tradeCredit);
    diffVal.textContent = `K ${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  window.calculateTradeIn = calculateTradeIn;

  function initTradeIn() {
    const brandSelect = document.getElementById('trade-brand');
    const modelSelect = document.getElementById('trade-model');
    const condSelect = document.getElementById('trade-condition');
    const targetSelect = document.getElementById('trade-target');
    const bookBtn = document.getElementById('book-trade-in-btn');

    if (brandSelect) brandSelect.addEventListener('change', populateTradeModels);
    if (modelSelect) modelSelect.addEventListener('change', calculateTradeIn);
    if (condSelect) condSelect.addEventListener('change', calculateTradeIn);
    if (targetSelect) targetSelect.addEventListener('change', calculateTradeIn);

    populateTradeTargets();
    populateTradeModels();
    calculateTradeIn();

    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        const brand = brandSelect ? brandSelect.value : 'Apple';
        const modelOpt = modelSelect ? modelSelect.selectedOptions[0] : null;
        const modelName = modelOpt ? modelOpt.textContent : 'My Device';
        const cond = condSelect ? condSelect.value : 'Good';
        const targetOpt = targetSelect ? targetSelect.selectedOptions[0] : null;
        const targetName = targetOpt ? targetOpt.textContent : 'Upgrade Device';
        const credit = document.getElementById('trade-credit-val') ? document.getElementById('trade-credit-val').textContent : 'K 0.00';
        const diff = document.getElementById('trade-diff-val') ? document.getElementById('trade-diff-val').textContent : 'K 0.00';

        const text = `*TRADE-IN ESTIMATION BOOKING — MACMO ELECTRONICS*\n` +
          `Store: Shop #1 Silverest Complex Lusaka (Opp UNILUS)\n` +
          `Current Device: ${brand.toUpperCase()} - ${modelName}\n` +
          `Condition: ${cond.toUpperCase()}\n` +
          `Target Upgrade: ${targetName}\n` +
          `Estimated Trade Credit: ${credit}\n` +
          `Estimated Difference: ${diff}\n\n` +
          `When can I bring my device to Silverest Complex for physical testing and instant trade-in?`;

        window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
      });
    }

    initLayby();
    initHeroQuickSearch();
  }

  // Smart Layby Dropdown & Math
  function populateLaybyDevices() {
    const select = document.getElementById('layby-device-select');
    if (!select) return;

    let items = [];
    if (typeof MACMO_STORE !== 'undefined' && MACMO_STORE.products && MACMO_STORE.products.length > 0) {
      items = MACMO_STORE.products;
    } else if (typeof MACMO_STORE !== 'undefined' && MACMO_STORE.upgradeTargets) {
      items = MACMO_STORE.upgradeTargets;
    }

    if (items.length === 0) return;

    select.innerHTML = items.map((p, idx) => `
      <option value="${p.id}" data-price="${p.price}" ${idx === 0 ? 'selected' : ''}>
        ${p.name} — K ${Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </option>
    `).join('');
  }

  window.setLaybyDeposit = function(rate) {
    laybyDepositRate = Number(rate) || 0.20;
    const rateBtns = document.querySelectorAll('.layby-rate-btn');
    rateBtns.forEach(btn => {
      const btnRate = parseFloat(btn.getAttribute('data-deposit'));
      if (Math.abs(btnRate - laybyDepositRate) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    window.calculateLayby();
  };

  window.setLaybyMonths = function(months) {
    laybyDurationMonths = parseInt(months, 10) || 2;
    const durBtns = document.querySelectorAll('.layby-duration-btn');
    durBtns.forEach(btn => {
      const btnMonths = parseInt(btn.getAttribute('data-months'), 10);
      if (btnMonths === laybyDurationMonths) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    window.calculateLayby();
  };

  window.calculateLayby = function() {
    const select = document.getElementById('layby-device-select');
    const totalEl = document.getElementById('layby-total-price');
    const depositEl = document.getElementById('layby-deposit-val');
    const balanceEl = document.getElementById('layby-balance-val');
    const installmentEl = document.getElementById('layby-installment-val');

    let price = 24999;
    if (select && select.selectedOptions && select.selectedOptions[0]) {
      price = parseFloat(select.selectedOptions[0].getAttribute('data-price')) || 24999;
    }

    const deposit = Math.round(price * laybyDepositRate);
    const balance = price - deposit;
    const months = laybyDurationMonths > 0 ? laybyDurationMonths : 2;
    const installment = Math.round((balance / months) * 100) / 100;

    if (totalEl) totalEl.textContent = `K ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (depositEl) depositEl.textContent = `K ${deposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (balanceEl) balanceEl.textContent = `K ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (installmentEl) installmentEl.textContent = `K ${installment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month`;
  };

  window.bookLaybyWA = function() {
    const select = document.getElementById('layby-device-select');
    const devOpt = select && select.selectedOptions ? select.selectedOptions[0] : null;
    const devName = devOpt ? devOpt.textContent.trim() : 'MacMo Premium Device';
    const total = document.getElementById('layby-total-price') ? document.getElementById('layby-total-price').textContent : 'K 24,999.00';
    const deposit = document.getElementById('layby-deposit-val') ? document.getElementById('layby-deposit-val').textContent : 'K 5,000.00';
    const balance = document.getElementById('layby-balance-val') ? document.getElementById('layby-balance-val').textContent : 'K 19,999.00';
    const installment = document.getElementById('layby-installment-val') ? document.getElementById('layby-installment-val').textContent : 'K 9,999.50 / month';
    const depPercent = Math.round(laybyDepositRate * 100);

    const text = `*SMART LAYBY RESERVATION — MACMO ELECTRONICS*\n` +
      `Store: Shop #1 Silverest Complex Lusaka (Opp UNILUS)\n` +
      `Selected Device: ${devName}\n` +
      `Total Price: ${total}\n` +
      `Deposit Plan: ${depPercent}% Initial Deposit\n` +
      `Deposit Due Today (Locks Device): ${deposit}\n` +
      `Remaining Balance: ${balance}\n` +
      `Duration: ${laybyDurationMonths} Month${laybyDurationMonths > 1 ? 's' : ''}\n` +
      `Installment Amount: ${installment}\n\n` +
      `Hello MacMo Team, I want to reserve this device on 0% Interest Layby. How do I send my initial deposit via Airtel / MTN / Bank?`;

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  function initLayby() {
    populateLaybyDevices();
    const select = document.getElementById('layby-device-select');
    if (select) {
      select.addEventListener('change', window.calculateLayby);
    }
    window.calculateLayby();
  }

  // Hero Quick Search & Category Jump
  function initHeroQuickSearch() {
    const heroInput = document.getElementById('heroQuickSearchInput');
    if (heroInput) {
      heroInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.triggerHeroSearch();
        }
      });
    }
  }

  window.triggerHeroSearch = function() {
    const heroInput = document.getElementById('heroQuickSearchInput');
    const catalogInput = document.getElementById('catalog-search-input');
    const query = heroInput ? heroInput.value.trim() : '';

    if (catalogInput) {
      catalogInput.value = query;
    }

    if (window.filterByCat) {
      window.filterByCat('all');
    }

    const catalogSec = document.getElementById('catalog');
    if (catalogSec) {
      catalogSec.scrollIntoView({ behavior: 'smooth' });
    }

    if (query && window.showToast) {
      window.showToast(`Searching store for "${query}"`);
    }
  };

    // 9. MOBILE BOTTOM BAR
  function initMobileBottomBar() {
    const bottomLinks = document.querySelectorAll('.mobile-bottom-bar .bottom-nav-item, .mobile-bottom-bar .m-bar-item');
    bottomLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            bottomLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      }
    });
  }

  // 10. TOAST SYSTEM
  function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast-bubble';
    toast.innerHTML = `
      <i class="fa-solid fa-circle-check"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 20);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 2800);
  }
  window.showToast = showToast;
  window.populateLaybyDeviceOptions = function() {
    populateLaybyDevices();
    populateTradeTargets();
  };

  // ONETECH HERO SPOTLIGHT SWITCHER & UNIFIED SEARCH
  const heroSpotlightItems = [
    {
      productId: 'p-iphone-15-pro-max',
      tag: 'FEATURED FLAGSHIP',
      oldPrice: 'K 26,500',
      price: 'K 24,999',
      name: 'Apple iPhone 15 Pro Max • 256GB Titanium',
      badge: 'Hot Deal',
      layby: '0% Layby: K 5,000 dep.',
      specs: 'A17 Pro 3nm • 48MP 5x Zoom • 12-Mo Warranty',
      image: 'images/iphone-15-pro-max.jpg'
    },
    {
      productId: 'p-ps5-slim',
      tag: 'NEXT-GEN GAMING',
      oldPrice: 'K 15,200',
      price: 'K 13,999',
      name: 'Sony PlayStation 5 Slim Console • 1TB SSD',
      badge: 'Best Seller',
      layby: '0% Layby: K 2,800 dep.',
      specs: '1TB Ultra-Speed SSD • 4K 120Hz • DualSense Wireless',
      image: 'images/ps5-slim.jpg'
    },
    {
      productId: 'p-macbook-air-m3',
      tag: 'PRO LAPTOPS & WORKSTATIONS',
      oldPrice: 'K 30,500',
      price: 'K 28,999',
      name: 'Apple MacBook Air 15" (M3) • 16GB / 512GB',
      badge: 'Work & Study',
      layby: '0% Layby: K 5,800 dep.',
      specs: 'Apple M3 Silicon • 18-Hr Battery • Liquid Retina',
      image: 'images/macbook-air-m3.jpg'
    },
    {
      productId: 'p-samsung-galaxy-s24-ultra',
      tag: 'GALAXY AI FLAGSHIP',
      oldPrice: 'K 24,000',
      price: 'K 22,499',
      name: 'Samsung Galaxy S24 Ultra 5G • Titanium',
      badge: 'Galaxy AI',
      layby: '0% Layby: K 4,500 dep.',
      specs: '200MP Quad Tele • Built-In S-Pen • Snapdragon 8 Gen 3',
      image: 'images/galaxy-s24-ultra.webp'
    }
  ];
  let activeSpotlightIdx = 0;

  window.switchHeroSpotlight = function(idx) {
    const item = heroSpotlightItems[idx] || heroSpotlightItems[0];
    activeSpotlightIdx = idx;

    const elTag = document.getElementById('heroFeaturedTag');
    const elOldPrice = document.getElementById('heroFeaturedOldPrice');
    const elPrice = document.getElementById('heroFeaturedPrice');
    const elName = document.getElementById('heroFeaturedName');
    const elBadge = document.getElementById('heroSpotlightBadge');
    const elLayby = document.getElementById('heroSpotlightLayby');
    const elSpecs = document.getElementById('heroSpotlightSpecs');
    const elImg = document.getElementById('heroSpotlightImg');

    if (elTag) elTag.textContent = item.tag;
    if (elOldPrice) elOldPrice.textContent = item.oldPrice;
    if (elPrice) elPrice.textContent = item.price;
    if (elName) elName.textContent = item.name;
    if (elBadge) elBadge.innerHTML = `<i class="fa-solid fa-bolt"></i> ${item.badge}`;
    if (elLayby) elLayby.textContent = item.layby;
    if (elSpecs) elSpecs.textContent = item.specs;
    if (elImg) {
      elImg.src = item.image;
      elImg.alt = item.name;
    }

    const pills = document.querySelectorAll('.hero-switch-pill');
    pills.forEach((btn, i) => btn.classList.toggle('active', i === idx));
  };

  window.openHeroActiveSpecs = function() {
    const item = heroSpotlightItems[activeSpotlightIdx] || heroSpotlightItems[0];
    if (window.openDeviceSpecs) window.openDeviceSpecs(item.productId);
  };

  window.orderHeroActiveWA = function() {
    const item = heroSpotlightItems[activeSpotlightIdx] || heroSpotlightItems[0];
    if (window.buyDirectWA) window.buyDirectWA(item.productId);
  };

  // Fix Hero Search & Add OneTech Header Search
  window.triggerHeroSearch = function() {
    const heroInput = document.getElementById('heroQuickSearchInput');
    const query = heroInput ? heroInput.value.trim() : '';
    applyUnifiedSearch(query, 'all');
  };

  window.triggerHeaderSearch = function() {
    const headerInput = document.getElementById('headerQuickSearchInput');
    const headerCat = document.getElementById('headerSearchCategory');
    const query = headerInput ? headerInput.value.trim() : '';
    const cat = headerCat ? headerCat.value : 'all';
    applyUnifiedSearch(query, cat);
  };

  function applyUnifiedSearch(query, category) {
    currentCategory = category || 'all';
    searchQuery = (query || '').toLowerCase();

    const filterTabs = document.querySelectorAll('.filter-tab-btn, .cat-pill');
    filterTabs.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-category') === currentCategory);
    });

    if (catalogSearchInput) catalogSearchInput.value = query || '';
    if (clearSearchBtn) clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';

    renderProducts();

    const storeSec = document.getElementById('store');
    if (storeSec) {
      storeSec.scrollIntoView({ behavior: 'smooth' });
    }
    if (query) {
      showToast(`Showing results for "${query}"`);
    }
  }

  // Wire up Enter key on Header Search & Categories Dropdown click
  document.addEventListener('DOMContentLoaded', () => {
    const headerInput = document.getElementById('headerQuickSearchInput');
    if (headerInput) {
      headerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.triggerHeaderSearch();
        }
      });
    }
    const catBtn = document.getElementById('catDropdownBtn');
    const catWrap = catBtn ? catBtn.closest('.onetech-cat-menu-container') : null;
    if (catBtn && catWrap) {
      catBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        catWrap.classList.toggle('open');
      });
      document.addEventListener('click', () => catWrap.classList.remove('open'));
    }
  });

  // Modal "Reserve on Layby" Bridge
  window.startLaybyForProduct = function() {
    const prodId = activeModalProductId;
    closeDeviceSpecs();
    window.switchServiceTab('layby');
    const select = document.getElementById('layby-device-select');
    if (select && prodId) {
      const optExists = Array.from(select.options).some(o => o.value === prodId);
      if (optExists) {
        select.value = prodId;
        window.calculateLayby();
      }
    }
    const tradeSec = document.getElementById('trade-in');
    if (tradeSec) {
      tradeSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Run init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
