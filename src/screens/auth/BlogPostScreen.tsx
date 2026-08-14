/**
 * BlogPostScreen — public blog hub + individual post view for Ozone Wash.
 * Spec: Auto Wash Scope PDF Section 6.6 (5 blog posts at launch).
 *
 * Two modes, controlled by route param:
 *   • no `slug` → hub view (all 5 posts as cards)
 *   • with `slug` → single post view
 *
 * URL: /blog            → hub
 *      /blog/[slug]     → individual post
 */

import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowLeft, ArrowRight, Drop, Sparkle, Flask, Lightning, Wrench, Clock,
} from '../../components/Icons';

const B = {
  primary:    '#0EA5E9',
  primaryDk:  '#0369A1',
  primaryDkr: '#0C4A6E',
  leaf:       '#22C55E',
  ink:        '#0B1F33',
  inkSoft:    '#334155',
  muted:      '#64748B',
  line:       '#E2E8F0',
  surface:    '#FFFFFF',
  surfaceAlt: '#F4F8FB',
  aqua:       '#E0F2FE',
};

type Post = {
  slug: string;
  title: string;
  intro: string;
  readMin: number;
  Icon: any;
  body: { kind: 'p' | 'h2' | 'ul'; text?: string; items?: string[] }[];
};

const POSTS: Post[] = [
  {
    slug: 'gated-community-car-wash-hyderabad',
    title: 'Why traditional car washes are banned in most Hyderabad gated communities (and what to do instead)',
    intro: "If you've ever tried to bring a wash van into your apartment complex, you know the story. Here's why — and the alternative most RWAs already approve.",
    readMin: 4,
    Icon: Drop,
    body: [
      { kind: 'p', text: 'Across Gachibowli, Kondapur, Madhapur, and most of Hyderabad\'s gated developments, the standard car wash van is now flat-out banned. The reasons stack up fast: diesel exhaust in the basement, hundreds of litres of soapy runoff into the storm drain, noise complaints at 7 a.m., the security desk arguing with a contractor who needs power and a water tap. Even RWAs that aren\'t outright banning the practice are quietly making it unworkable.' },
      { kind: 'h2', text: 'What changed?' },
      { kind: 'p', text: 'Two things. First, Telangana\'s urban-runoff regulations now flag soap and detergent runoff as a pollutant. Second, lift-style apartment blocks discovered that a 90-decibel pressure washer at sunrise is enough to trigger a society meeting. So associations push the problem onto the resident: "Wash your car somewhere else."' },
      { kind: 'h2', text: 'The EV doorstep alternative' },
      { kind: 'p', text: 'Ozone Wash Auto solves all three frictions in one design choice: the entire setup runs on a Bajaj RE EV (or equivalent), carries its own ~30-litre water tank, uses zero detergents, and dries with microfibres. There\'s no exhaust because there\'s no combustion engine. There\'s no high-decibel pump because ozone-treated water cleans on contact, no pressure washer required. There\'s no runoff because the whole exchange happens with 3 litres of water.' },
      { kind: 'p', text: 'That combination is why RWAs that ban every other wash service approve us at the gate. We arrive silently, work for 30–75 minutes depending on package, and leave behind a QR-signed hygiene certificate the resident can share with the building secretary if they\'re ever questioned.' },
    ],
  },
  {
    slug: 'what-is-ozone-car-wash-is-it-safe',
    title: 'What is ozone car wash? Is it safe for your family?',
    intro: 'Ozone sounds chemistry-class scary. The science is actually simpler than chlorine, and it\'s used in every bottled mineral water plant in India.',
    readMin: 5,
    Icon: Flask,
    body: [
      { kind: 'p', text: 'Ozone (O₃) is just oxygen with one extra atom. That third atom is loosely bound and wants to detach — and when it does, it oxidises the nearest organic molecule. That\'s the whole mechanism behind ozone disinfection.' },
      { kind: 'h2', text: 'Why it kills germs better than chlorine' },
      { kind: 'ul', items: [
        'Ozone oxidises bacterial cell walls in seconds. Chlorine takes minutes.',
        'Ozone reaches mould inside AC vents — chlorine can\'t.',
        'After the reaction, ozone decomposes back into ordinary O₂. Chlorine leaves chlorinated byproducts.',
        'Bottled-water brands in India use ozone for purification — that\'s the same molecule we use on your seats.',
      ] },
      { kind: 'h2', text: 'Is it safe for your car interior?' },
      { kind: 'p', text: 'Yes. The two safety rules are: (1) the cabin must be closed during fogging, and (2) you wait 15 minutes after the crew finishes before re-entering. That\'s it. After 15 minutes, the ozone has fully reverted to O₂. Leather, fabric, plastic, and electronics are entirely unaffected — ozone targets organic life, not materials.' },
      { kind: 'p', text: 'We enforce the 15-minute wait window through the crew\'s app, the customer\'s app banner, and an automatic WhatsApp safety alert. You can\'t skip it.' },
    ],
  },
  {
    slug: 'how-much-water-does-car-wash-waste',
    title: 'How much water does your car wash waste? We did the math',
    intro: 'A traditional wash uses ~50 litres per car. We tested ours: 2.8 L average. Here\'s the breakdown — and what it means for your building\'s water bill.',
    readMin: 4,
    Icon: Drop,
    body: [
      { kind: 'p', text: 'India\'s residential water tariff in Hyderabad is roughly ₹15 per kilolitre for the first slab, climbing to ₹60+/kL above 20 kL. Most apartments hit the higher slab in summer. Add tanker top-ups at ₹500–₹1,500 per delivery, and the cost of "extra water" starts mattering.' },
      { kind: 'h2', text: 'Where the 50 litres go in a conventional wash' },
      { kind: 'ul', items: [
        'Pre-rinse: 10–15 L',
        'Foam rinse-off: 15–20 L',
        'Interior cleaner rinse: 5–10 L',
        'Wheels: 8–12 L',
        'Splash + spillage: 5–10 L',
      ] },
      { kind: 'h2', text: 'Where our 3 litres go' },
      { kind: 'p', text: 'Our EV unit carries a 30-litre tank. A typical EcoRinse uses 2.5–3.5 L per car: a mist rinse, an eco-foam application, and a final ozone rinse. Microfibre drying replaces the second full rinse a traditional wash would do.' },
      { kind: 'p', text: 'Multiplied across a 200-flat society: a weekly car wash schedule using 50 L/car/wk vs 3 L/car/wk = 9,400 L saved per society per week. That\'s nearly half a tanker.' },
    ],
  },
  {
    slug: 'ac-vent-musty-smell-ozone-fogging',
    title: 'Car AC smells musty? Here\'s why (and how ozone vent fogging fixes it)',
    intro: 'That damp-towel smell when you turn the AC on isn\'t the cabin filter. It\'s mould growing inside the evaporator. Ozone gets in where wipes can\'t.',
    readMin: 4,
    Icon: Sparkle,
    body: [
      { kind: 'p', text: 'The air conditioning evaporator sits deep inside the dashboard. Whenever it cools, it condenses moisture out of the air. In a tropical climate, the evaporator is wet for most of the year. Wet + dark + warm at the edges = mould.' },
      { kind: 'h2', text: 'Why a "cabin air filter replacement" doesn\'t fix it' },
      { kind: 'p', text: 'The filter sits upstream of the evaporator. The smell is downstream — coming from the wet coils themselves. Replacing the filter masks the issue for a week, then it returns.' },
      { kind: 'h2', text: 'What ozone vent fogging does' },
      { kind: 'p', text: 'We open the AC to its maximum recirculation setting, insert an ozone nozzle into the cabin air intake, and let ozone circulate through the ducting for 5 minutes. The ozone reaches every cubic millimetre of the evaporator and ducts — places wipes physically can\'t reach. Mould and bacteria are oxidised. The smell stops.' },
      { kind: 'p', text: 'Add it as a ₹199–₹299 upgrade to any wash package. One treatment usually lasts the full season.' },
    ],
  },
  {
    slug: 'why-upholstery-needs-steam-clean-every-3-months',
    title: 'Why your car upholstery needs professional steam cleaning every 3 months',
    intro: 'Fabric seats absorb sweat, food crumbs, kids\' juice, and skin cells. Vacuums only get the top layer. Here\'s what 120°C steam reaches.',
    readMin: 4,
    Icon: Wrench,
    body: [
      { kind: 'p', text: 'A vacuum is a surface tool. It pulls dust and crumbs from the top 2-3 mm of the fabric pile. Everything below that — sweat salts, sunscreen residue, dropped food, the proteins from a spilled juice last summer — stays in the foam padding underneath.' },
      { kind: 'h2', text: 'What lives in your seats' },
      { kind: 'ul', items: [
        'Skin cells — every passenger sheds them.',
        'Dust mites — they eat the skin cells.',
        'Mould spores — settle whenever the cabin is damp.',
        'Salts and protein residue from sweat, food, and beverages.',
        'Allergens — pollen, pet dander, fabric softener residue.',
      ] },
      { kind: 'h2', text: 'Why 120°C steam works' },
      { kind: 'p', text: 'Steam at 120°C does two things vacuums can\'t: it penetrates the full depth of the fabric, and it sterilises. Dust mites and mould spores die at sustained temperatures above 60°C. Sweat salt dissolves, and the extractor pulls it out. The seat doesn\'t just look cleaner — it stops being a biological habitat.' },
      { kind: 'p', text: 'A steam clean every 3 months keeps upholstery in nearly-new condition. Skip it for a year and you\'re looking at permanent staining and a 10–15% hit to resale value.' },
    ],
  },
];

export default function BlogPostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isLarge } = useResponsive();

  const slug: string | undefined = route.params?.slug;
  const post = slug ? POSTS.find((p) => p.slug === slug) : null;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = post
      ? `${post.title} | Ozone Wash Blog`
      : 'Blog · Ozone Wash — Water hygiene, ozone, EV doorstep cleaning';
  }, [post]);

  // ── Hub view ──────────────────────────────────────────────────────────
  if (!post) {
    return (
      <View style={styles.root}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[B.primaryDkr, B.primaryDk]} style={[styles.hubHero, { paddingTop: insets.top + 18 }]}>
            <View style={[styles.inner, isLarge && { maxWidth: 900, alignSelf: 'center', width: '100%' }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
                <ArrowLeft size={18} weight="bold" color="#fff" />
              </TouchableOpacity>
              <Text style={styles.eyebrow}>OZONE WASH BLOG</Text>
              <Text style={styles.hubH1}>
                Water hygiene, ozone science,{'\n'}and the EV doorstep economy.
              </Text>
              <Text style={styles.hubSub}>5 posts to read. ~20 minutes total.</Text>
            </View>
          </LinearGradient>

          <View style={[styles.section, isLarge && { paddingHorizontal: 48, maxWidth: 900, alignSelf: 'center', width: '100%' }]}>
            <View style={[styles.postGrid, isLarge && { gap: 18 }]}>
              {POSTS.map((p) => (
                <TouchableOpacity
                  key={p.slug}
                  onPress={() => navigation.setParams({ slug: p.slug })}
                  activeOpacity={0.85}
                  style={styles.postCard}
                >
                  <View style={styles.postIcon}>
                    <p.Icon size={22} weight="duotone" color={B.primaryDk} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postTitle}>{p.title}</Text>
                    <Text style={styles.postIntro}>{p.intro}</Text>
                    <View style={styles.postMeta}>
                      <Clock size={11} weight="duotone" color={B.muted} />
                      <Text style={styles.postMetaText}>{p.readMin} min read</Text>
                    </View>
                  </View>
                  <ArrowRight size={18} weight="bold" color={B.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: insets.bottom + 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Single post view ──────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[B.primaryDkr, B.primaryDk]} style={[styles.postHero, { paddingTop: insets.top + 18 }]}>
          <View style={[styles.inner, isLarge && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity onPress={() => navigation.setParams({ slug: undefined })} style={styles.backBtn} activeOpacity={0.85}>
              <ArrowLeft size={18} weight="bold" color="#fff" />
            </TouchableOpacity>
            <Text style={styles.eyebrow}>OZONE WASH BLOG</Text>
            <Text style={styles.postH1}>{post.title}</Text>
            <View style={styles.postHeroMeta}>
              <Clock size={12} weight="duotone" color="rgba(255,255,255,0.7)" />
              <Text style={styles.postHeroMetaText}>{post.readMin} min read</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.section, { paddingTop: 28 }, isLarge && { paddingHorizontal: 48, maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
          <Text style={styles.intro}>{post.intro}</Text>
          {post.body.map((b, i) => {
            if (b.kind === 'h2') return <Text key={i} style={styles.h2}>{b.text}</Text>;
            if (b.kind === 'ul') return (
              <View key={i} style={{ gap: 6, marginTop: 6, marginBottom: 12 }}>
                {b.items!.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={styles.bullet}>·</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            );
            return <Text key={i} style={styles.p}>{b.text}</Text>;
          })}

          {/* Cross-link to other posts */}
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>Keep reading</Text>
            {POSTS.filter((p) => p.slug !== slug).slice(0, 3).map((p) => (
              <TouchableOpacity
                key={p.slug}
                onPress={() => navigation.setParams({ slug: p.slug })}
                activeOpacity={0.85}
                style={styles.relatedItem}
              >
                <Text style={styles.relatedItemTitle}>{p.title}</Text>
                <ArrowRight size={14} weight="bold" color={B.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.surface },
  inner: { paddingHorizontal: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  eyebrow: { color: '#BAE6FD', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },

  /* hub */
  hubHero: { paddingBottom: 38 },
  hubH1: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -1, marginTop: 10 },
  hubSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8 },

  section: { paddingVertical: 28, paddingHorizontal: 20 },

  postGrid: { gap: 12 },
  postCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 16, borderRadius: 14,
    backgroundColor: B.surface, borderWidth: 1, borderColor: B.line,
  },
  postIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center',
  },
  postTitle: { fontSize: 15, fontWeight: '800', color: B.ink, lineHeight: 21, marginBottom: 6 },
  postIntro: { fontSize: 12, color: B.muted, lineHeight: 18 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  postMetaText: { fontSize: 11, color: B.muted, fontWeight: '600' },

  /* single post */
  postHero: { paddingBottom: 36 },
  postH1: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.6, marginTop: 10 },
  postHeroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  postHeroMetaText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  intro: { fontSize: 16, color: B.inkSoft, lineHeight: 25, marginBottom: 16, fontWeight: '600' },
  h2: { fontSize: 18, fontWeight: '800', color: B.ink, marginTop: 18, marginBottom: 8, letterSpacing: -0.3 },
  p: { fontSize: 15, color: B.ink, lineHeight: 24, marginBottom: 12 },
  bullet: { fontSize: 15, color: B.primary, fontWeight: '800', width: 10 },
  bulletText: { fontSize: 14, color: B.ink, lineHeight: 22, flex: 1 },

  related: { marginTop: 28, paddingTop: 24, borderTopWidth: 1, borderTopColor: B.line, gap: 8 },
  relatedTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: B.primaryDk, marginBottom: 8 },
  relatedItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: B.surfaceAlt,
  },
  relatedItemTitle: { fontSize: 13, fontWeight: '700', color: B.ink, flex: 1, marginRight: 10 },
});

export { POSTS };
