import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft } from '../../components/Icons';

export type PolicyType = 'terms' | 'privacy' | 'refund';

const TITLES: Record<PolicyType, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  refund: 'Refund Policy',
};

const UPDATED: Record<PolicyType, string> = {
  terms: 'Last updated: April 1, 2026',
  privacy: 'Last updated: April 1, 2026',
  refund: 'Last updated: April 1, 2026',
};

/* ────────────────────────────────────────────────────────────────────────── */
const TERMS_CONTENT = `
TERMS & CONDITIONS

These Terms and Conditions ("Terms") govern your use of the Ozone Wash mobile application and services provided by VijRam Health Sense Pvt. Ltd. ("Company", "we", "our", "us"), a company incorporated under the laws of India, with its principal office in Hyderabad, Telangana.

By downloading or using the app, booking a service, or accessing our platform in any way, you agree to be bound by these Terms.

1. SERVICES

Ozone Wash provides app-enabled water tank hygiene cleaning services using ozone treatment technology. Our services include overhead tank cleaning, underground sump cleaning, and plastic/syntex tank cleaning, along with optional add-ons such as lime treatment, structure health checks, and advanced water testing.

2. ELIGIBILITY

You must be at least 18 years old to use this application and book services. By using the app, you represent and warrant that you have the legal capacity to enter into a binding contract.

3. BOOKING & APPOINTMENTS

3.1 Bookings are confirmed only upon successful payment or COD confirmation.
3.2 You are responsible for ensuring the service location is accessible on the scheduled date and time.
3.3 Please ensure the tank is empty or nearly empty prior to our team's arrival for best results.
3.4 The Company reserves the right to reschedule appointments due to unforeseen circumstances or force majeure events, with advance notice wherever possible.

4. PRICING

4.1 All prices displayed in the app are inclusive of applicable taxes unless stated otherwise.
4.2 Prices may vary based on tank size, type, location, and selected add-ons.
4.3 The Company reserves the right to modify pricing at any time, but confirmed bookings will be honoured at the original price.

5. PAYMENTS

5.1 We accept UPI, debit/credit cards, digital wallets, and Cash on Delivery.
5.2 Online payments are processed through Razorpay. We do not store your payment card information.
5.3 In case of payment failure, no amount will be deducted. If deducted, it will be refunded within 5–7 business days.

6. CANCELLATIONS

6.1 You may cancel a booking up to 4 hours before the scheduled slot at no charge.
6.2 Cancellations made within 4 hours of the slot may attract a cancellation fee as specified in our Refund Policy.
6.3 No-shows (customer unavailable at the time of service) may be treated as a cancellation.

7. SERVICE GUARANTEE

7.1 We guarantee professional ozone-based tank cleaning with an 8-step compliance process.
7.2 A digital hygiene certificate with QR verification is issued upon successful completion of service.
7.3 If you are not satisfied with the quality of service, please raise a concern through the app within 24 hours of service completion and we will address it.

8. ANNUAL MAINTENANCE CONTRACTS (AMC)

8.1 AMC subscribers receive scheduled tank cleaning services as per the selected plan.
8.2 AMC plans are non-transferable and tied to the registered account.
8.3 Renewal is the customer's responsibility. Lapsed AMC plans are not eligible for retroactive renewals.

9. INTELLECTUAL PROPERTY

All content, logos, trademarks, and materials on the Ozone Wash app are the exclusive property of VijRam Health Sense Pvt. Ltd. and are protected under applicable intellectual property laws.

10. LIMITATION OF LIABILITY

To the fullest extent permitted by law, the Company shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid for the specific service in question.

11. GOVERNING LAW

These Terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana.

12. CONTACT

For any queries regarding these Terms, contact us at:
📧 support@ozonewash.in
📞 +91 98481 44854
`;

/* ────────────────────────────────────────────────────────────────────────── */
const PRIVACY_CONTENT = `
PRIVACY POLICY

VijRam Health Sense Pvt. Ltd. ("Company", "we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use the Ozone Wash app.

1. INFORMATION WE COLLECT

1.1 Personal Information: Name, mobile number, email address, and service address provided during registration or booking.
1.2 Location Data: With your consent, we collect GPS location to detect your service address and for field team navigation. Location data is only collected when you explicitly use the location feature.
1.3 Device Information: Device type, OS version, app version, and unique device identifiers for push notifications and analytics.
1.4 Transaction Data: Booking history, payment status, and AMC subscription details.
1.5 Usage Data: App interactions and feature usage patterns to improve the product.

2. HOW WE USE YOUR DATA

2.1 To process and fulfil your service bookings.
2.2 To send booking confirmations, OTP verifications, and service updates via SMS, WhatsApp, and push notifications.
2.3 To issue digital hygiene certificates linked to your account.
2.4 To improve our services through aggregated, anonymised analytics.
2.5 To contact you for support-related queries.
2.6 To comply with applicable legal and regulatory requirements.

3. DATA SHARING

3.1 We do not sell, rent, or trade your personal information to third parties.
3.2 We share data with:
    • Razorpay: for payment processing (governed by their privacy policy).
    • Firebase (Google): for authentication and push notifications.
    • Cloudflare R2: for secure storage of compliance photos and certificates.
    • SMS/WhatsApp providers: only for sending transactional messages.
3.3 We may disclose data if required by law or government authorities.

4. DATA RETENTION

We retain your personal data for as long as your account is active or as required by law. You may request deletion of your account and associated data by contacting us.

5. DATA SECURITY

We implement industry-standard security measures including encryption in transit (HTTPS/TLS), secure database access controls, and JWT-based authentication to protect your data.

6. YOUR RIGHTS

You have the right to:
• Access your personal data stored with us.
• Correct inaccurate information.
• Request deletion of your data (subject to legal obligations).
• Withdraw consent for non-essential data processing.

To exercise these rights, contact us at support@ozonewash.in.

7. CHILDREN'S PRIVACY

Our services are not directed to children under 18. We do not knowingly collect data from minors.

8. COOKIES & TRACKING

The app does not use browser cookies. We may use anonymised device identifiers for analytics purposes only.

9. CHANGES TO THIS POLICY

We may update this Privacy Policy periodically. We will notify you of significant changes through the app or via registered contact information.

10. CONTACT

For privacy-related queries:
📧 privacy@ozonewash.in
📞 +91 98481 44854
VijRam Health Sense Pvt. Ltd., Hyderabad, Telangana — 500001
`;

/* ────────────────────────────────────────────────────────────────────────── */
const REFUND_CONTENT = `
REFUND & CANCELLATION POLICY

This policy applies to all services booked through the Ozone Wash app, operated by VijRam Health Sense Pvt. Ltd.

1. CANCELLATIONS BY CUSTOMER

1.1 Free Cancellation: You may cancel a confirmed booking free of charge up to 4 hours before the scheduled service slot.
1.2 Late Cancellation: Cancellations made within 4 hours of the scheduled slot will attract a cancellation fee of ₹200 or 10% of the booking value, whichever is higher.
1.3 No-Show: If the customer is unavailable at the service location at the scheduled time, the booking will be treated as a no-show and no refund will be issued.
1.4 How to Cancel: Cancellations must be made through the app under "My Bookings → View Details → Cancel Booking".

2. CANCELLATIONS BY OZONE WASH

2.1 If we are unable to fulfil a confirmed booking due to team unavailability, weather, or any other reason, we will notify you at least 2 hours in advance.
2.2 A full refund will be processed within 3–5 business days.
2.3 We will offer you the option to reschedule at no extra charge.

3. REFUND ELIGIBILITY

3.1 Prepaid bookings (UPI/card/wallet) that are cancelled within the free cancellation window are eligible for a full refund.
3.2 Partial refunds may be issued for late cancellations after deducting the applicable cancellation fee.
3.3 Cash on Delivery (COD) bookings do not require a refund; no charge is collected if cancelled before service commencement.
3.4 Refunds are not applicable after the service has been successfully completed and a hygiene certificate has been issued.

4. QUALITY COMPLAINTS

4.1 If you are dissatisfied with the quality of service, raise a complaint within 24 hours of service completion through the app.
4.2 We will investigate and, at our discretion, offer a re-service at no cost or a partial refund up to 50% of the service value.
4.3 Refunds are not issued for complaints raised after 24 hours of service completion.

5. AMC PLAN REFUNDS

5.1 AMC plans that have not been used for any service are eligible for a full refund within 7 days of purchase.
5.2 Partial refunds may be issued for unused services in an AMC plan, calculated on a pro-rata basis.
5.3 AMC plans partially consumed are not eligible for full refunds.

6. REFUND TIMELINE

Approved refunds are processed to the original payment method:
• UPI / Wallets: 1–3 business days
• Debit / Credit Cards: 5–7 business days
• Net Banking: 3–5 business days

7. HOW TO REQUEST A REFUND

Contact us at:
📧 support@ozonewash.in
📞 +91 98481 44854

Please provide your booking ID and reason for refund. Our team will respond within 24 business hours.

8. DISPUTES

Any refund dispute may be escalated via email to disputes@ozonewash.in. Unresolved disputes will be subject to the governing law and jurisdiction as described in our Terms & Conditions.
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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.companyBadge}>
          <Text style={styles.companyName}>VijRam Health Sense Pvt. Ltd.</Text>
          <Text style={styles.companyCity}>Hyderabad, Telangana, India</Text>
        </View>

        <Text style={styles.bodyText}>{CONTENT[type].trim()}</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For any queries, contact us at{' '}
            <Text style={styles.footerLink}>support@ozonewash.in</Text>
            {' '}or call{' '}
            <Text style={styles.footerLink}>+91 98481 44854</Text>
          </Text>
        </View>
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
