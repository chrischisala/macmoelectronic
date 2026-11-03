/**
 * MACMO ELECTRONICS — OFFICIAL PRODUCT INVENTORY & CATALOG DATA
 * Shop #1, Silverest Complex, Great East Road, Lusaka (Opposite UNILUS)
 * WhatsApp / Phone: +260 972 756 767 | +260 572 408 101
 * Official Facebook: https://www.facebook.com/p/MacMo-Electronics-61581449006021/
 * Official TikTok: https://www.tiktok.com/@macmo.electronics2
 */

var MACMO_STORE = {

  info: {
    name: "MacMo Electronics",
    tagline: "Next-Gen Tech & Smart Upgrades • Lusaka's Premier Electronics Hub",
    location: "Shop #1, Silverest Complex, Great East Road, Lusaka, Zambia",
    landmark: "Directly opposite University of Lusaka (UNILUS Silverest Campus)",
    phones: ["+260 972 756 767", "+260 572 408 101"],
    whatsapp: "260972756767",
    hours: "Monday – Saturday: 8:30 AM – 6:30 PM | Sunday: 10:00 AM – 4:00 PM",
    delivery: "Same-Day Delivery in Lusaka (Free to UNILUS Campus) • Countrywide Courier via EMS/Power Tools",
    warranty: "12-Month Official Warranty on all brand-new devices",
    socials: {
      facebook: "https://www.facebook.com/p/MacMo-Electronics-61581449006021/",
      facebookHandle: "MacMo Electronics",
      tiktok: "https://www.tiktok.com/@macmo.electronics2",
      tiktokHandle: "@macmo.electronics2",
      whatsapp: "https://wa.me/260972756767"
    }
  },

  // Official Trade-In Catalog for live valuation calculator
  tradeInCatalog: {
    Apple: [
      { id: "ip-15-pm", name: "Apple iPhone 15 Pro Max", baseValue: 20000 },
      { id: "ip-15-p", name: "Apple iPhone 15 Pro", baseValue: 17500 },
      { id: "ip-15", name: "Apple iPhone 15", baseValue: 13000 },
      { id: "ip-14-pm", name: "Apple iPhone 14 Pro Max", baseValue: 15500 },
      { id: "ip-14-p", name: "Apple iPhone 14 Pro", baseValue: 13500 },
      { id: "ip-14", name: "Apple iPhone 14", baseValue: 10500 },
      { id: "ip-13-pm", name: "Apple iPhone 13 Pro Max", baseValue: 12500 },
      { id: "ip-13-p", name: "Apple iPhone 13 Pro", baseValue: 11000 },
      { id: "ip-13", name: "Apple iPhone 13", baseValue: 8800 },
      { id: "ip-12-pm", name: "Apple iPhone 12 Pro Max", baseValue: 9500 },
      { id: "ip-12-p", name: "Apple iPhone 12 Pro", baseValue: 8200 },
      { id: "ip-12", name: "Apple iPhone 12", baseValue: 6800 },
      { id: "ip-11-pm", name: "Apple iPhone 11 Pro Max", baseValue: 6500 },
      { id: "ip-11", name: "Apple iPhone 11", baseValue: 4800 },
      { id: "ip-xr-xs", name: "Apple iPhone XR / XS Max", baseValue: 3500 }
    ],
    Samsung: [
      { id: "sam-s24u", name: "Samsung Galaxy S24 Ultra", baseValue: 19000 },
      { id: "sam-s24p", name: "Samsung Galaxy S24+ / S24", baseValue: 13500 },
      { id: "sam-s23u", name: "Samsung Galaxy S23 Ultra", baseValue: 14500 },
      { id: "sam-s23", name: "Samsung Galaxy S23 / S23+", baseValue: 9500 },
      { id: "sam-s22u", name: "Samsung Galaxy S22 Ultra", baseValue: 10500 },
      { id: "sam-s22", name: "Samsung Galaxy S22", baseValue: 7200 },
      { id: "sam-s21u", name: "Samsung Galaxy S21 Ultra", baseValue: 7500 },
      { id: "sam-note20u", name: "Samsung Galaxy Note 20 Ultra", baseValue: 6200 },
      { id: "sam-zfold5", name: "Samsung Galaxy Z Fold 5", baseValue: 16500 },
      { id: "sam-zflip5", name: "Samsung Galaxy Z Flip 5", baseValue: 10000 }
    ],
    Sony: [
      { id: "ps-ps5-disc", name: "Sony PS5 Disc Edition (Used)", baseValue: 10500 },
      { id: "ps-ps5-digital", name: "Sony PS5 Digital Edition (Used)", baseValue: 9000 },
      { id: "ps-ps4-pro", name: "Sony PlayStation 4 Pro 1TB", baseValue: 5500 },
      { id: "ps-ps4-slim", name: "Sony PlayStation 4 Slim 500GB/1TB", baseValue: 4200 }
    ],
    MacBook: [
      { id: "mac-m2-air", name: "Apple MacBook Air 13 M2 (Used)", baseValue: 16500 },
      { id: "mac-m1-air", name: "Apple MacBook Air 13 M1 (Used)", baseValue: 12000 },
      { id: "mac-m1-pro", name: "Apple MacBook Pro 14 M1 Pro (Used)", baseValue: 18500 },
      { id: "ipad-pro-m", name: "Apple iPad Pro 11 / 12.9 M-Chip", baseValue: 11500 },
      { id: "ipad-air-m", name: "Apple iPad Air 4 / 5", baseValue: 8000 }
    ],
    Google: [
      { id: "pix-8pro", name: "Google Pixel 8 Pro", baseValue: 13500 },
      { id: "pix-8", name: "Google Pixel 8", baseValue: 9800 },
      { id: "pix-7pro", name: "Google Pixel 7 Pro", baseValue: 8500 },
      { id: "pix-7", name: "Google Pixel 7", baseValue: 6200 }
    ]
  },

  upgradeTargets: [
    { id: "p-iphone-15-pro-max", name: "Apple iPhone 15 Pro Max (K 24,999)", price: 24999 },
    { id: "p-iphone-15-black", name: "Apple iPhone 15 (128GB) (K 17,899)", price: 17899 },
    { id: "p-iphone-14-pro-max", name: "Apple iPhone 14 Pro Max 256GB (K 19,999)", price: 19999 },
    { id: "p-iphone-13", name: "Apple iPhone 13 128GB (K 12,499)", price: 12499 },
    { id: "p-ps5-slim", name: "Sony PlayStation 5 Slim Console (K 13,999)", price: 13999 },
    { id: "p-macbook-air-m3", name: 'Apple MacBook Air 15" M3 (K 28,999)', price: 28999 },
    { id: "p-samsung-galaxy-s24-ultra", name: "Samsung Galaxy S24 Ultra (K 22,499)", price: 22499 },
    { id: "p-ipad-air-m2", name: 'Apple iPad Air 11" M2 (K 14,899)', price: 14899 },
    { id: "p-romoss-60000", name: "Romoss 60,000mAh Power Station (K 1,950)", price: 1950 }
  ],

  heroFlagships: [
    {
      id: "hero-iphone",
      tabTitle: "iPhone 15 Pro Max",
      tabIcon: "fa-solid fa-mobile-screen",
      categoryTag: "Flagship Smartphone",
      name: "Apple iPhone 15 Pro Max",
      sub: "Forged in Aerospace Titanium • A17 Pro Chip",
      price: 24999,
      priceFormatted: "K 24,999.00",
      image: "images/iphone-15-pro-max.jpg",
      glowColor: "rgba(59, 130, 246, 0.28)",
      specs: [
        { label: "Titanium Chassis", val: "A17 Pro 3nm Silicon", icon: "fa-solid fa-microchip" },
        { label: "Pro Camera", val: "48MP • 5x Optical Zoom", icon: "fa-solid fa-camera" },
        { label: "Display", val: '6.7" Super Retina 120Hz', icon: "fa-solid fa-mobile" },
        { label: "Authenticity", val: "100% Genuine • 1-Yr Warranty", icon: "fa-solid fa-shield-halved" }
      ],
      waText: "Hello MacMo Electronics, I would like to order or reserve the Apple iPhone 15 Pro Max Titanium (K 24,999) from your website."
    },
    {
      id: "hero-ps5",
      tabTitle: "PlayStation 5 Slim",
      tabIcon: "fa-solid fa-gamepad",
      categoryTag: "Next-Gen Console",
      name: "Sony PlayStation 5 Slim Console",
      sub: "1TB Ultra-High Speed SSD • 4K 120Hz Ray Tracing",
      price: 13999,
      priceFormatted: "K 13,999.00",
      image: "images/ps5-slim.jpg",
      glowColor: "rgba(99, 102, 241, 0.3)",
      specs: [
        { label: "Storage", val: "1TB Ultra-Speed SSD", icon: "fa-solid fa-hard-drive" },
        { label: "Controller", val: "DualSense Wireless Haptics", icon: "fa-solid fa-gamepad" },
        { label: "Performance", val: "4K 120FPS • Tempest 3D Audio", icon: "fa-solid fa-tv" },
        { label: "Campus Hit", val: "Top UNILUS Student Pick", icon: "fa-solid fa-fire" }
      ],
      waText: "Hello MacMo Electronics, I would like to order or reserve the Sony PlayStation 5 Slim (K 13,999) from your website."
    },
    {
      id: "hero-macbook",
      tabTitle: 'MacBook Air 15" (M3)',
      tabIcon: "fa-solid fa-laptop",
      categoryTag: "Pro Workstation",
      name: "Apple MacBook Air 15-inch (M3)",
      sub: "Liquid Retina Display • 18-Hour All-Day Battery",
      price: 28999,
      priceFormatted: "K 28,999.00",
      image: "images/macbook-air-m3.jpg",
      glowColor: "rgba(14, 165, 233, 0.28)",
      specs: [
        { label: "Silicon", val: "Apple M3 8-Core / 10-Core GPU", icon: "fa-solid fa-bolt" },
        { label: "Memory", val: "16GB Unified RAM • 512GB SSD", icon: "fa-solid fa-memory" },
        { label: "Battery", val: "Up to 18 Hours Battery Life", icon: "fa-solid fa-battery-full" },
        { label: "Work & Study", val: "Perfect for Code & Office", icon: "fa-solid fa-code" }
      ],
      waText: "Hello MacMo Electronics, I would like to order or reserve the MacBook Air 15 M3 (K 28,999) from your website."
    }
  ],

  categories: [
    { id: "all", name: "All Products", icon: "fa-solid fa-border-all" },
    { id: "phones", name: "Smartphones", icon: "fa-solid fa-mobile-screen-button" },
    { id: "computers", name: "Laptops", icon: "fa-solid fa-laptop" },
    { id: "tablets", name: "iPads & Tablets", icon: "fa-solid fa-tablet-screen-button" },
    { id: "gaming", name: "PlayStation & Gaming", icon: "fa-solid fa-gamepad" },
    { id: "audio", name: "Audio & Speakers", icon: "fa-solid fa-headphones" },
    { id: "wearables", name: "Wearables & Watches", icon: "fa-solid fa-stopwatch" },
    { id: "power", name: "Power & Load-Shedding", icon: "fa-solid fa-bolt" },
    { id: "accessories", name: "Accessories & Gear", icon: "fa-solid fa-plug" }
  ],

  // Full Active Device Catalog
  products: [
    {
      id: "p-iphone-15-pro-max",
      name: "Apple iPhone 15 Pro Max",
      category: "phones",
      brand: "Apple",
      specs: "256GB • 512GB • 1TB • Titanium • A17 Pro Chip",
      price: 24999,
      priceFormatted: "K 24,999.00",
      image: "images/iphone-15-pro-max.jpg",
      badge: "Flagship",
      stock: "In Stock at Silverest",
      rating: 5.0,
      description: "Forged in titanium. Powered by the groundbreaking A17 Pro chip, customizable Action button, 48MP main camera, and 5x optical telephoto zoom. 12-Month MacMo warranty."
    },
    {
      id: "p-iphone-15-black",
      name: "Apple iPhone 15 (128GB)",
      category: "phones",
      brand: "Apple",
      specs: "128GB • Dynamic Island • 48MP Main • USB-C",
      price: 17899,
      priceFormatted: "K 17,899.00",
      image: "images/iphone-15-black.webp",
      badge: "Popular Pick",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Dynamic Island bubbles up alerts and Live Activities. 48MP Main camera shoots in super-high resolution. Durable color-infused glass and aluminum design with USB-C universal charging."
    },
    {
      id: "p-iphone-14-pro-max",
      name: "Apple iPhone 14 Pro Max (256GB)",
      category: "phones",
      brand: "Apple",
      specs: "256GB • Deep Purple / Space Black • Always-On OLED • A16 Bionic",
      price: 19999,
      priceFormatted: "K 19,999.00",
      image: "images/iphone-15-pro-max.jpg",
      badge: "Best Value Pro",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "The beloved powerhouse with Dynamic Island, 48MP quad-pixel sensor, crash detection, and phenomenal 29-hour battery life. Certified Grade A+ with MacMo warranty."
    },
    {
      id: "p-iphone-13",
      name: "Apple iPhone 13 (128GB)",
      category: "phones",
      brand: "Apple",
      specs: "128GB • Midnight Black • Super Retina XDR • A15 Bionic",
      price: 12499,
      priceFormatted: "K 12,499.00",
      image: "images/iphone-15-black.webp",
      badge: "Campus Hit",
      stock: "In Stock at Silverest",
      rating: 4.8,
      description: "Top-selling student smartphone in Lusaka. Cinematic video mode, lightning-fast 5G speeds, ultra-durable Ceramic Shield front glass, and vibrant Super Retina XDR OLED display."
    },
    {
      id: "p-iphone-11",
      name: "Apple iPhone 11 (128GB)",
      category: "phones",
      brand: "Apple",
      specs: "128GB • Dual 12MP Ultra-Wide • All-Day Battery • Night Mode",
      price: 6899,
      priceFormatted: "K 6,899.00",
      image: "images/iphone-15-black.webp",
      badge: "Budget King",
      stock: "In Stock at Silverest",
      rating: 4.8,
      description: "Incredible value for money. Liquid Retina HD display, 4K video recording, water resistant up to 2 meters for 30 minutes, and proven reliability for university studies."
    },
    {
      id: "p-samsung-galaxy-s24-ultra",
      name: "Samsung Galaxy S24 Ultra 5G",
      category: "phones",
      brand: "Samsung",
      specs: "256GB • 512GB • Titanium Gray • S-Pen Built-in • Galaxy AI",
      price: 22499,
      priceFormatted: "K 22,499.00",
      image: "images/galaxy-s24-ultra.webp",
      badge: "Galaxy AI",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "The ultimate form of Galaxy Ultra. Features Titanium shield, built-in S-Pen, Circle to Search, Live Translate, and 200MP camera zoom with Quad Tele System."
    },
    {
      id: "p-ps5-slim",
      name: "Sony PlayStation 5 Slim Console",
      category: "gaming",
      brand: "Sony PlayStation",
      specs: "1TB Ultra-High Speed SSD • 4K 120Hz • DualSense Wireless Included",
      price: 13999,
      priceFormatted: "K 13,999.00",
      image: "images/ps5-slim.jpg",
      badge: "Gaming Pick",
      stock: "In Stock at Silverest",
      rating: 5.0,
      description: "Experience lightning-fast loading with an ultra-high-speed SSD, deeper immersion with haptic feedback, adaptive triggers, and 3D Audio. Slimmer chassis with 1TB onboard storage."
    },
    {
      id: "p-ps4-pro",
      name: "Sony PlayStation 4 Pro (1TB)",
      category: "gaming",
      brand: "Sony PlayStation",
      specs: "1TB HDD • 4K HDR Gaming • DualShock 4 Controller Included",
      price: 6499,
      priceFormatted: "K 6,499.00",
      image: "images/ps5-slim.jpg",
      badge: "Popular Value",
      stock: "In Stock at Silverest",
      rating: 4.8,
      description: "Dynamic 4K gaming and entertainment. Play all FIFA/FC24, GTA V, and Call of Duty favorites smoothly. Fully tested, cleaned, and warrantied."
    },
    {
      id: "p-macbook-air-m3",
      name: "Apple MacBook Air 15-inch (M3)",
      category: "computers",
      brand: "Apple",
      specs: "M3 8-Core CPU • 10-Core GPU • 16GB Unified RAM • 512GB SSD",
      price: 28999,
      priceFormatted: "K 28,999.00",
      image: "images/macbook-air-m3.jpg",
      badge: "Study Pick",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Lean, mean M3 machine. Built for Apple Intelligence, insane 18-hour battery life, and liquid retina display perfect for university students and developers."
    },
    {
      id: "p-ipad-air-m2",
      name: "Apple iPad Air 11-inch (M2)",
      category: "tablets",
      brand: "Apple",
      specs: "128GB • Liquid Retina • Apple Pencil Pro Ready • Touch ID",
      price: 14899,
      priceFormatted: "K 14,899.00",
      image: "images/ipad-air.webp",
      badge: "Creative Pick",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Freshly redesigned with the groundbreaking M2 chip. Supports the latest Apple Pencil Pro and Magic Keyboard for notes, engineering drawing, and digital art."
    },
    {
      id: "p-apple-watch-s9",
      name: "Apple Watch Series 9 GPS 45mm",
      category: "wearables",
      brand: "Apple",
      specs: "S9 SiP • Double Tap Gesture • Precision Finding • Heart Health",
      price: 8499,
      priceFormatted: "K 8,499.00",
      image: "images/apple-watch.webp",
      badge: "Smart Fitness",
      stock: "In Stock at Silverest",
      rating: 4.8,
      description: "Smarter, brighter, and mightier. Double tap gesture control, 2000 nits Always-On Retina display, ECG, blood oxygen measurement, and crash detection."
    },
    {
      id: "p-airpods-pro-2",
      name: "Apple AirPods Pro (2nd Gen, USB-C)",
      category: "audio",
      brand: "Apple",
      specs: "H2 Chip • Active Noise Cancellation • Adaptive Audio • MagSafe",
      price: 5299,
      priceFormatted: "K 5,299.00",
      image: "images/airpods-pro.webp",
      badge: "Pro Audio",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Up to 2x more Active Noise Cancellation. Transparency mode allows outside sounds in, while Adaptive Audio seamlessly blends them. USB-C charging case with Find My speaker."
    },
    {
      id: "p-jbl-charge-5",
      name: "JBL Charge 5 Portable Speaker",
      category: "audio",
      brand: "JBL",
      specs: "40W Output • IP67 Waterproof • 20 Hours Playtime • Built-in Powerbank",
      price: 3699,
      priceFormatted: "K 3,699.00",
      image: "images/jbl-speaker.webp",
      badge: "Best Seller",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Bold JBL Original Pro Sound. Long-lasting battery powers through hostel hangouts, study breaks, and outdoor trips. Charges your phone via USB while playing."
    },
    {
      id: "p-galaxy-buds-2-pro",
      name: "Samsung Galaxy Buds 2 Pro",
      category: "audio",
      brand: "Samsung",
      specs: "24-bit Hi-Fi Audio • Intelligent 360 Audio • ANC • IPX7 Water Resistant",
      price: 3499,
      priceFormatted: "K 3,499.00",
      image: "images/galaxy-buds.webp",
      badge: "Hi-Fi Sound",
      stock: "In Stock at Silverest",
      rating: 4.7,
      description: "Studio-quality sound packed in an ultra-ergonomic compact design. Seamless auto-switching between Galaxy devices and crystal-clear voice calls."
    },
    {
      id: "p-oraimo-freepods-4",
      name: "Oraimo FreePods 4 ANC Earbuds",
      category: "audio",
      brand: "Oraimo",
      specs: "Active Noise Cancellation • 35.5h Playtime • Low-Latency Game Mode",
      price: 899,
      priceFormatted: "K 899.00",
      image: "images/galaxy-buds.webp",
      badge: "Budget Audio",
      stock: "In Stock at Silverest",
      rating: 4.8,
      description: "The highest rated budget earbuds in Zambia. Clear 4-mic call technology, custom EQ via Oraimo Sound App, IPX5 waterproof rating, and instant Bluetooth pairing."
    },
    {
      id: "p-dji-om-6",
      name: "DJI Osmo Mobile 6 Smartphone Gimbal",
      category: "accessories",
      brand: "DJI",
      specs: "3-Axis Stabilization • Built-in Extension Rod • ActiveTrack 6.0",
      price: 3899,
      priceFormatted: "K 3,899.00",
      image: "images/camera-gimbal.webp",
      badge: "Content Creator",
      stock: "In Stock at Silverest",
      rating: 4.8,
      description: "Unlock cinematic smoothness on your iPhone or Android. Built-in extension rod for dynamic angles and flawless TikTok/Reels video creation."
    },
    {
      id: "p-oraimo-powerbank-40k",
      name: "Oraimo PowerBox 40,000mAh Power Bank",
      category: "power",
      brand: "Oraimo",
      specs: "40,000mAh • 22.5W Super Fast Charging • Multi-Device Output • LED Torch",
      price: 1299,
      priceFormatted: "K 1,299.00",
      image: "images/powerbank-40k.jpg",
      badge: "Load-Shedding Essential",
      stock: "In Stock at Silverest",
      rating: 5.0,
      description: "Survive Lusaka load-shedding with continuous power. Charges iPhones 8-10 times over and powers WiFi routers and study lamps effortlessly."
    },
    {
      id: "p-romoss-60000",
      name: "Romoss 60,000mAh Extreme Power Station",
      category: "power",
      brand: "Romoss",
      specs: "60,000mAh Monster Capacity • 22.5W Two-Way Fast Charge • LED Display",
      price: 1950,
      priceFormatted: "K 1,950.00",
      image: "images/powerbank-40k.jpg",
      badge: "Heavy Duty",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Huge capacity battery bank built to sustain entire student dorm rooms or family electronics through extended 12+ hour ZESCO load-shedding outages."
    },
    {
      id: "p-ecoflow-river-2",
      name: "EcoFlow River 2 Max Portable Power Station",
      category: "power",
      brand: "EcoFlow",
      specs: "512Wh LiFePO4 Battery • 500W-1000W X-Boost AC Output • 60-min Fast Charge",
      price: 9499,
      priceFormatted: "K 9,499.00",
      image: "images/power-station-600.jpg",
      badge: "Pro Backup",
      stock: "In Stock at Silverest",
      rating: 5.0,
      description: "Zero load-shedding downtime. Runs laptops, monitors, WiFi routers, gaming consoles, and lighting seamlessly. Charges from 0-100% in just 60 minutes."
    },
    {
      id: "p-apple-20w-charger",
      name: "Apple 20W USB-C Fast Adapter & Cable",
      category: "accessories",
      brand: "Apple",
      specs: "20W Power Delivery • USB-C to Lightning / Type-C • Genuine",
      price: 450,
      priceFormatted: "K 450.00",
      image: "images/airpods-pro.webp",
      badge: "Genuine Apple",
      stock: "In Stock at Silverest",
      rating: 4.9,
      description: "Certified genuine Apple 20W USB-C Power Adapter with durable braided fast-charging cable. Safeguards your battery health against voltage spikes."
    }
  ],

  // B2B & Corporate Procurement Solutions
  b2bSolutions: [
    {
      id: "b2b-laptops",
      title: "Corporate Laptops & Workstations",
      desc: "Fleet deployment of M3 MacBooks, Dell XPS, and ThinkPads with unified billing and maintenance agreements.",
      tag: "Enterprise IT"
    },
    {
      id: "b2b-power",
      title: "Load-Shedding Office UPS Systems",
      desc: "Tailored solar power stations and pure sine-wave inverter backup keeping office desks and internet up.",
      tag: "Business Continuity"
    },
    {
      id: "b2b-executive",
      title: "Executive Smartphone Allocations",
      desc: "Authorized Apple & Samsung corporate smartphones with MDM configuration and priority replacement.",
      tag: "Executive Tech"
    },
    {
      id: "b2b-education",
      title: "University & Student Bulk Packs",
      desc: "Special discounted educational hardware bundles for UNILUS students, faculty members, and research departments.",
      tag: "Education"
    }
  ],

  // Common Trade-In Comparison Presets
  tradeInPresets: [
    {
      current: "Apple iPhone 13 (128GB)",
      target: "Apple iPhone 15 Pro Max (256GB)",
      credit: 8800,
      topUp: 16199,
      note: "Top student upgrade choice"
    },
    {
      current: "Samsung Galaxy S22 Ultra",
      target: "Samsung Galaxy S24 Ultra (Titanium)",
      credit: 10500,
      topUp: 11999,
      note: "Instant Galaxy AI upgrade"
    },
    {
      current: "Sony PlayStation 4 Pro 1TB",
      target: "Sony PlayStation 5 Slim Console",
      credit: 5500,
      topUp: 8499,
      note: "Next-gen gaming leap"
    }
  ]
};

// Export for node or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MACMO_STORE;
}
