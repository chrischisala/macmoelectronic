/**
 * MACMO ELECTRONICS — SITE CONFIGURATION & SETTINGS
 * Centralized settings for WhatsApp hotlines, dual-branch locations (Town Center & Silverest),
 * delivery policies, campus drop-off, and store hours.
 * Can be managed dynamically via /admin/ Studio Manager or updated here.
 */
window.MACMO_CONFIG = {
  brandName: 'MacMo Electronics',
  brandSlogan: 'Innovate. Elevate. Connect.',
  brandTagline: 'Innovate. Elevate. Connect. • Lusaka, Zambia',
  storeLocation: 'Town Center (Voltic Building, Kalundwe & Cha-Cha Rd) • Silverest (Asado Complex Shop #1, Opp. UNILUS)',
  landmark: 'Voltic Building (Town Center) & Opposite UNILUS Silverest Campus (Great East Road)',

  // Official Dual-Branch Locations
  branches: {
    townCenter: {
      id: 'town-center',
      name: 'Town Center Branch',
      badge: 'LUSAKA CBD • OPEN 7 DAYS',
      address: 'Kalundwe Road, Cha-Cha Rd Corner, Voltic Building, Lusaka',
      shortAddress: 'Voltic Building, Kalundwe & Cha-Cha Rd Corner, Town Center',
      landmark: 'Corner of Kalundwe Rd & Cha-Cha Rd, Voltic Building',
      hours: 'Mon – Sun: 07:30 – 18:30',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Voltic+Building+Kalundwe+Road+Cha+Cha+Road+Lusaka+Zambia'
    },
    silverest: {
      id: 'silverest',
      name: 'Silverest Branch',
      badge: 'UNILUS CAMPUS • GREAT EAST RD',
      address: 'Asado Complex Shop #1, Opposite University of Lusaka (UNILUS), Silverest Campus, Great East Road',
      shortAddress: 'Asado Complex Shop #1, Opp. UNILUS Silverest Campus',
      landmark: 'Opposite University of Lusaka (UNILUS), Silverest Campus',
      hours: 'Mon – Sat: 09:00 – 18:00',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Asado+Complex+University+of+Lusaka+Silverest+Campus+Great+East+Road+Lusaka+Zambia'
    }
  },

  // Contact Hotlines
  whatsappPrimary: '260972756767',
  whatsappSecondary: '260572408101',
  phoneDisplayPrimary: '+260 972 756 767',
  phoneDisplaySecondary: '+260 572 408 101',
  email: 'orders@macmoelectronics.com',

  // Operating Hours Summary
  hoursWeekday: 'Town Center: Mon–Sun 07:30–18:30 | Silverest: Mon–Sat 09:00–18:00',
  hoursSunday: 'Town Center Open Sundays (07:30 – 18:30) • Silverest Closed Sundays',

  // Perks & Delivery
  unilusCampusFreeDelivery: true,
  deliveryNotice: 'Free same-day UNILUS campus drop-off • Express delivery across Lusaka • EMS & Power Tools countrywide',
  warrantyNotice: '12-Month Official Warranty on all brand-new hardware',

  // Social Channels
  socials: {
    facebook: 'https://www.facebook.com/p/MacMo-Electronics-61581449006021/',
    tiktok: 'https://www.tiktok.com/@macmo.electronics2',
    whatsappCommunity: 'https://wa.me/260972756767'
  }
};
