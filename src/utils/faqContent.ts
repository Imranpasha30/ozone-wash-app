/**
 * Single source of truth for FAQ content.
 * Web version (FaqScreen) is the canonical wording — both that screen and the
 * native landing inline accordion read from this file so they stay identical.
 */

export type FaqEntry = { cat: string; q: string; a: string };

export const FAQ_DATA: FaqEntry[] = [
  { cat: 'Before You Book', q: 'Is Ozone safe for drinking water tanks?', a: 'Yes. Ozone is a stronger oxidiser than chlorine yet leaves no chemical residue. It decomposes back into oxygen within minutes, making it safer for potable water than chemical cleaners. Most bottled mineral water brands use Ozone for purification.' },
  { cat: 'Before You Book', q: 'How long does a service take?', a: 'Domestic tanks are typically completed within 2 hours. Larger tanks may take longer depending on size and condition, but every service is completed in a single visit, no second trip, no mess.' },
  { cat: 'Before You Book', q: "What's included in the 8-step process?", a: 'Our patent-applied 8-step hygiene covers pre-check & setup, drain, mechanical scrub & rotary jet, high-pressure rinse, sludge removal, Ozone disinfection, optional UV double-lock, and after-wash testing with QR-signed proof delivery.' },
  { cat: 'Before You Book', q: 'Do you service my area?', a: 'Yes. We are currently operating across multiple areas in Hyderabad and rapidly expanding. Enter your pincode at booking to see exact availability and pricing.' },

  { cat: 'Safety & Science', q: 'How does Ozone clean my tank?', a: 'Ozone ruptures bacterial and viral cells, neutralises toxins, and oxidises metals. Unlike chlorine, Ozone leaves no chemical residue. It decomposes back into oxygen within minutes.' },
  { cat: 'Safety & Science', q: 'How is Ozone better than chemicals?', a: 'Ozone is a stronger oxidiser than chlorine, killing pathogens up to 3,000 times faster. It neutralises chlorine-resistant organisms, penetrates biofilm, and leaves no chemical residue. Just pure, residue-free water.' },

  { cat: 'Compliance & Proof', q: 'How do QR certificates work?', a: 'Each service generates a QR-signed hygiene certificate with Ozone readings, ATP hygiene checks, and before/after photos. Audit-ready for RWAs, hospitals, and regulators. Share it instantly with tenants, buyers, or inspectors.' },
  { cat: 'Compliance & Proof', q: 'What does GHMC law say about tank cleaning?', a: 'Under the GHMC Act, 1955 (Public Health & Sanitation Bye-laws), drinking water tanks must be cleaned every 3 to 6 months. For commercial establishments and institutions, quarterly cleaning is required to stay compliant.' },
  { cat: 'Compliance & Proof', q: 'How often should tanks be cleaned?', a: 'Domestic tanks: every 3 to 6 months. Commercial establishments: every 3 months. RWAs and hospitals: quarterly. AMC packages ensure recurring compliance and cost savings.' },
  { cat: 'Compliance & Proof', q: 'Why is certified tank hygiene important today?', a: 'Recent outbreaks across India caused thousands of illnesses due to contaminated tanks. Ozone Wash ensures proof-based hygiene with QR certificates and EcoScore tracking.' },

  { cat: 'AMC Plans', q: 'What is an AMC plan?', a: 'A subscription plan with fixed cleaning intervals (monthly, quarterly, half-yearly, or yearly) and built-in discounts.' },
  { cat: 'AMC Plans', q: 'How do AMC discounts work?', a: 'Monthly: 30%. Quarterly: 15%. Half-Yearly: 10%. Yearly: 5%. Multi-tank: 2 tanks 15%, 2+ tanks 30%. All AMC prices are GST-inclusive.' },
  { cat: 'AMC Plans', q: 'Why choose AMC over one-time cleaning?', a: 'Ensures compliance, cost savings, EcoScore tracking, and priority scheduling. Forgetting is now history.' },
  { cat: 'AMC Plans', q: 'What if I miss a scheduled AMC service?', a: 'You can reschedule within the same cycle. EcoScore tracks delays so you stay on top of compliance.' },

  { cat: 'Upgrades & Add-Ons', q: 'What hygiene upgrades can I add?', a: 'UV Sterilisation, Anti-Algae Spray, Anti-Lime Treatment, Pathogen Testing, Structural Audit, and IoT Sensors.' },
  { cat: 'Upgrades & Add-Ons', q: 'Are add-ons optional?', a: 'Yes. The base Ozone service already delivers certified hygiene. Add-ons provide extra assurance, compliance proof, and preventive protection. They bundle at discounted rates with AMC.' },

  { cat: 'Testing & Proof', q: 'Do you provide testing after cleaning?', a: 'Yes. Every service includes pre and post hygiene checks showing measurable improvement in tank quality.' },
  { cat: 'Testing & Proof', q: 'What is the lab-based upgrade?', a: 'A 21-parameter certified laboratory report covering pathogens, chemical residues, and water quality. Ideal for RWAs, hospitals, and regulators.' },
  { cat: 'Testing & Proof', q: 'Tank hygiene vs source contamination?', a: 'Testing validates tank hygiene post-service, but the water supply itself may still be contaminated. GHMC municipal water, tankers, and borewell sources have all reported contamination incidents. Source filtration is recommended alongside tank hygiene.' },

  { cat: 'EcoScore', q: 'What is EcoScore?', a: 'A gamified hygiene rating (0 to 100) that converts compliance data into a score, badge, rationale, and improvement tips.' },
  { cat: 'EcoScore', q: 'What do the badges mean?', a: 'Platinum (90+), Gold (75 to 89), Silver (60 to 74), Bronze (40 to 59), Unrated (under 40). Each badge shows a rationale (timely service, Ozone + UV cycles logged, water test passed, AMC compliant).' },
  { cat: 'EcoScore', q: 'What are EcoPoints and how do I redeem them?', a: 'Your EcoScore percentage equals your EcoPoints. Bonus points for badges and streaks. Points accumulate in your wallet (valid 24 months, capped at 1,000) and redeem against AMC renewal discounts, hygiene upgrades, partner benefits, and streak rewards.' },

  { cat: 'Preparation', q: 'What preparations are needed before cleaning?', a: 'Ensure clear access to the tank, switch off pumps, inform residents, keep alternate water ready, remove nearby clutter, and provide a 16A power socket for equipment. Send the "Ozone at Work" caution message so residents know the hygiene process is in progress.' },
  { cat: 'Preparation', q: 'What should I avoid during cleaning?', a: "Don't use tank water until the certificate is issued, don't leave lids open, don't delay cleaning beyond 6 months, and don't add chemicals yourself. Keep humans and pets away from the Ozone work zone until the service is certified safe." },

  { cat: 'For Your Sector', q: 'RWAs: How do we share proof with residents?', a: 'Each service generates a QR-signed certificate and EcoScore dashboard, shareable with residents and regulators in one tap.' },
  { cat: 'For Your Sector', q: 'Hospitals: Is Ozone safe for patient tanks?', a: 'Yes. Ozone sterilises without residues. Natural and safer than chemicals for sensitive environments like hospitals and clinics.' },
  { cat: 'For Your Sector', q: 'Restaurants: How do you ensure kitchen hygiene?', a: 'Our Hygiene Wall Wash service disinfects walls and surfaces monthly, leaving them odour-less and sterilised.' },
];

export const FAQ_CATEGORIES = ['All', ...Array.from(new Set(FAQ_DATA.map(f => f.cat)))];
