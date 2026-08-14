import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useNavigation, useRoute } from '@react-navigation/native';
import WebContainer from '../../components/WebContainer';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft } from '../../components/Icons';

export type PolicyType = 'terms' | 'privacy' | 'refund';

const TITLES: Record<PolicyType, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  refund: 'Cancellation & Reschedule Policy',
};

const UPDATED: Record<PolicyType, string> = {
  terms: 'Last updated: May 2, 2026',
  privacy: 'Last updated: May 2, 2026',
  refund: 'Last updated: May 2, 2026',
};

/* ────────────────────────────────────────────────────────────────────────── */
const TERMS_CONTENT = `
TERMS & CONDITIONS

1. ACCEPTANCE OF TERMS

By accessing or using Ozonewash.in or the Ozone Wash™ mobile app, you agree to these Terms & Conditions. If you do not agree, please discontinue use immediately.

2. SERVICES PROVIDED

• Ozone Wash™ provides residential and commercial tank hygiene services using ozone and UV technology.
• Services include cleaning, disinfection, certification, and optional hygiene add-ons (UV, anti-algae, pathogen testing, IoT sensors).
• All services are subject to availability, inspection, and confirmation at the time of booking.

3. BOOKING & PAYMENTS

• Bookings can be made via website, app, WhatsApp, or phone.
• Prices shown are indicative; final pricing is confirmed after tank inspection.
• Payments must be made via approved gateways (UPI, cards, wallets, COD).
• GST is applicable as per Indian law.

4. ANNUAL MAINTENANCE CONTRACTS (AMC)

• AMC plans (monthly, quarterly, half-yearly, yearly) provide discounted recurring services.
• AMC discounts: Monthly (30%), Quarterly (15%), Half-Yearly (10%), Yearly (5%).
• AMC contracts are non-transferable and valid only for the registered property.

5. HYGIENE CERTIFICATES & ECOSCORE

• Each service generates a QR-verified hygiene certificate with before/after photos, ozone readings, and crew ID.
• EcoScore™ badges (Platinum/Gold/Silver/Bronze) reflect compliance and hygiene standards.
• Certificates are valid until the next scheduled cleaning or AMC renewal.

6. PATHOGEN TESTING (TERRA ENVIRON LABS)

• Ozone Wash™ offers optional pathogen testing through Terra Environ Labs Pvt. Ltd., a NABL-accredited and ISO 9001-certified laboratory.
• Testing covers up to 23 parameters, including E. coli, coliforms, turbidity, TDS, hardness, nitrates, and other water quality indicators.
• Pathogen testing validates tank hygiene post-cleaning. It does not certify the purity of incoming municipal, borewell, or tanker water.
• Reports are issued by Terra Environ Labs and shared digitally with customers. Ozone Wash™ is not responsible for delays or discrepancies in third-party lab reporting.
• Pathogen testing is a paid add-on service, priced between ₹1,500–₹4,000 depending on tank size and scope. AMC customers may avail discounted pathogen testing as part of their hygiene upgrade bundle.
• Customers agree that Ozone Wash™ acts as a facilitator and shall not be liable for health claims, disputes, or regulatory actions arising solely from lab findings.
• Customers consent to Ozone Wash™ storing and sharing lab reports with RWAs, hospitals, or regulators if required.

7. CUSTOMER RESPONSIBILITIES

• Ensure safe access to tanks, availability of power supply, and alternate water arrangements during cleaning.
• Do not use tank water until the hygiene certificate is issued.
• Customers must not interfere with ozone/UV equipment during operation.

8. LIMITATIONS OF SERVICE

• Ozone Wash™ cleans tanks and sumps only; it does not guarantee the purity of incoming municipal, borewell, or tanker water.
• Certificates validate tank hygiene, not the external water source.
• Service timelines may vary depending on tank size, condition, and accessibility.

9. LIABILITY & INDEMNITY

• Ozone Wash™ is not liable for damages caused by pre-existing tank defects, structural issues, or contaminated water sources.
• Customers indemnify Ozone Wash™ against claims arising from misuse of tanks post-cleaning.

10. DATA & PRIVACY

• Customer data (name, address, contact, service logs, photos, lab reports) is collected for service delivery and compliance.
• Data is stored securely and may be shared with regulators (GHMC, TSPCB) if required.
• Ozone Wash™ does not sell customer data to third parties.

11. CANCELLATION & REFUNDS

• Bookings may be cancelled up to 24 hours before scheduled service.
• Refunds are processed within 7–10 business days.
• AMC cancellations are subject to pro-rated deductions.

12. INTELLECTUAL PROPERTY

• Ozone Wash™, Ozone Guard™, EcoScore™, and the 8-Step Hygiene Process are patent-applied and trademarked.
• Unauthorized use, reproduction, or imitation is strictly prohibited.

13. GOVERNING LAW

• These Terms & Conditions are governed by the laws of India.
• Jurisdiction: Hyderabad, Telangana.

14. AMENDMENTS

• Ozone Wash™ reserves the right to update these Terms & Conditions at any time.
• Changes will be notified via website/app updates.

CONTACT

VijRam Health Sense Pvt. Ltd.
Flat No 201, Sai Krishna Thakur Residency, Padmaraonagar,
Secunderabad, Hyderabad – 500025
📧 hello@ozonewash.in
📞 81 79 69 59 59
`;

/* ────────────────────────────────────────────────────────────────────────── */
const PRIVACY_CONTENT = `
PRIVACY POLICY

1. INTRODUCTION

Ozone Wash™, operated by VijRam Health Sense Pvt. Ltd., values your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our website, mobile app, or services.

2. INFORMATION WE COLLECT

We may collect the following information:
• Personal details: Name, phone number, email, address.
• Service data: Tank type, size, booking details, AMC contracts.
• Proof data: Before/after photos, hygiene certificates, EcoScore logs.
• Payment data: UPI, card, wallet, or COD transaction details.
• Lab reports: Pathogen testing results from Terra Environ Labs (if opted).
• Device data: IP address, browser type, app usage logs.

3. HOW WE USE YOUR INFORMATION

We use your information to:
• Deliver and manage tank hygiene services.
• Generate QR-verified hygiene certificates and EcoScore badges.
• Provide AMC reminders, renewal alerts, and compliance tracking.
• Share pathogen testing reports (if opted) with RWAs, hospitals, or regulators.
• Improve our services, app performance, and customer experience.
• Comply with legal and regulatory requirements.

4. SHARING OF INFORMATION

• Service delivery: Data is shared with our certified crews for job execution.
• Lab testing: Pathogen testing reports are issued by Terra Environ Labs, NABL accredited and ISO 9001 certified.
• Regulatory compliance: Data may be shared with GHMC, TSPCB, or other authorities if required.
• Third-party integrations: Payment gateways, WhatsApp automation, and IoT sensors operate under their own privacy policies.
• We do not sell or rent customer data to third parties.

5. DATA SECURITY

• All customer data is stored securely with encryption and access controls.
• Certificates, photos, and lab reports are protected with QR verification and tamper-evident signatures.
• Regular audits ensure compliance with Indian IT Act and data protection norms.

6. CUSTOMER RIGHTS

You have the right to:
• Access your hygiene certificates, EcoScore, and lab reports.
• Request correction of inaccurate personal data.
• Request deletion of your data (subject to regulatory retention requirements).
• Opt out of marketing communications.

7. DATA RETENTION

• Service logs, certificates, and AMC records are retained for minimum 24 months for compliance and audit purposes.
• Lab reports are retained as per NABL/ISO guidelines.
• Data may be anonymized for analytics after expiry.

8. COOKIES & TRACKING

• The website may use cookies for session management, analytics, and personalization.
• Customers can disable cookies in browser settings, but some features may not function properly.

9. CHILDREN'S PRIVACY

Our services are intended for households, RWAs, and institutions. We do not knowingly collect personal data from children under 18 without parental consent.

10. CHANGES TO POLICY

Ozone Wash™ reserves the right to update this Privacy Policy. Updates will be published on the website and app.

11. CONTACT US

For privacy concerns, corrections, or data requests, contact:

VijRam Health Sense Pvt. Ltd.
Flat No 201, Sai Krishna Thakur Residency, Padmaraonagar,
Secunderabad, Hyderabad – 500025
📧 hello@ozonewash.in
📞 81 79 69 59 59
`;

/* ────────────────────────────────────────────────────────────────────────── */
const REFUND_CONTENT = `
CANCELLATION & RESCHEDULE POLICY

1. GENERAL POLICY

• Ozone Wash™ allows customers to cancel or reschedule bookings subject to the conditions below.
• All requests must be made via website, app, WhatsApp, or customer support.
• Refunds and reschedules are processed in compliance with Indian consumer protection laws.

2. CANCELLATION

• Free cancellation: Up to 24 hours before scheduled service → full refund.
• Late cancellation: Within 24 hours of service → 25% deduction to cover crew allocation costs.
• Service not delivered: If Ozone Wash™ fails to deliver due to operational reasons (crew unavailability, equipment failure, regulatory restrictions) → full refund or reschedule at no extra cost.
• AMC contracts: Refunds are pro-rated based on services already delivered. Discounts or benefits already availed (EcoScore points, hygiene upgrades) will be excluded.
• Add-ons: Hygiene upgrades (UV, anti-algae, pathogen testing, IoT sensors) are non-refundable once delivered. If pathogen testing by Terra Environ Labs is delayed or not delivered, only the testing fee will be refunded.

3. RESCHEDULE

• Free reschedule: Requests made at least 24 hours before service.
• Late reschedule: Requests made within 24 hours of service may incur a 15% rescheduling fee.
• AMC customers: May reschedule services within the same cycle (monthly, quarterly, half-yearly, yearly) without penalty. Missed AMC services can be rescheduled, but EcoScore™ tracking will mark delays.
• Add-ons: Rescheduling of hygiene upgrades is possible only if requested before crew arrival. Pathogen testing reschedules depend on Terra Environ Labs' availability.
• Limitations: Rescheduling is subject to crew availability and may not be guaranteed during peak demand periods (festivals, summer shortages).

4. REFUND & RESCHEDULE PROCESSING

• Refunds are processed via the original payment method (UPI, card, wallet, COD).
• Processing time: 7–10 business days.
• Customers receive confirmation via SMS/WhatsApp/email once refund or reschedule is approved.

5. EXCEPTIONS

No refunds or reschedules will be issued for:
• Incorrect customer information (wrong address, inaccessible tanks).
• Service refusal at site due to unsafe conditions or non-compliance with safety SOPs.
• Partial dissatisfaction where hygiene certificate and proof photos confirm service completion.

6. CONTACT

For cancellations, refunds, or reschedules, contact:

VijRam Health Sense Pvt. Ltd.
Flat No 201, Sai Krishna Thakur Residency, Padmaraonagar,
Secunderabad, Hyderabad – 500025
📧 hello@ozonewash.in
📞 81 79 69 59 59
`;

const CONTENT: Record<PolicyType, string> = {
  terms: TERMS_CONTENT,
  privacy: PRIVACY_CONTENT,
  refund: REFUND_CONTENT,
};

/* ────────────────────────────────────────────────────────────────────────── */
const PolicyScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const type: PolicyType = route.params?.type ?? 'terms';

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{TITLES[type]}</Text>
          <Text style={styles.headerSub}>{UPDATED[type]}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WebContainer variant="narrow">
        <View style={styles.companyBadge}>
          <Text style={styles.companyName}>VijRam Health Sense Pvt. Ltd.</Text>
          <Text style={styles.companyCity}>Hyderabad, Telangana, India</Text>
        </View>

        <Text style={styles.bodyText}>{CONTENT[type].trim()}</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For any queries, contact us at{' '}
            <Text style={styles.footerLink}>hello@ozonewash.in</Text>
            {' '}or call{' '}
            <Text style={styles.footerLink}>81 79 69 59 59</Text>
          </Text>
        </View>
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48 },
  companyBadge: {
    backgroundColor: C.primaryBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.borderActive,
  },
  companyName: { fontSize: 13, fontWeight: '700', color: C.primary },
  companyCity: { fontSize: 12, color: C.muted, marginTop: 2 },
  bodyText: {
    fontSize: 14,
    color: C.foreground,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: { fontSize: 13, color: C.muted, lineHeight: 20, textAlign: 'center' },
  footerLink: { color: C.primary, fontWeight: '600' },
});

export default PolicyScreen;
