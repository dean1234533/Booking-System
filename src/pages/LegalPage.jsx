import React, { useEffect } from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";

// ── Brand tokens (match Home) ──────────────────────────────────────────────
const G = {
  gold:      "#C9A84C",
  goldLight: "#e8c97a",
  dark:      "#0d0d0d",
  dark2:     "#1a1a1a",
  warmWhite: "#faf8f4",
};
const SERIF = "'Playfair Display', serif";
const SANS  = "'DM Sans', sans-serif";

const LAST_UPDATED = "June 2026";

const TERMS = {
  title: "Terms & Conditions",
  intro: `These Terms & Conditions ("Terms") govern your access to and use of the Bookrightly platform, including our website, booking tools, dashboards and related services (together, the "Service"). By creating an account or using the Service you agree to these Terms.`,
  sections: [
    { h: "1. Who we are", b: [
      `Bookrightly is an online marketplace that connects customers with independent service professionals (such as barbers, hairdressers, decorators and personal trainers) and provides those professionals with booking, payment and business-management tools.`,
      `Bookrightly provides the platform only. We are not a party to any agreement between a professional and their customer, and we do not provide the underlying services booked through the platform.`,
    ]},
    { h: "2. Accounts", b: [
      `You must provide accurate information when registering and keep it up to date. You are responsible for keeping your login details secure and for all activity that happens under your account.`,
      `You must be at least 18 years old, or the age of majority in your jurisdiction, to create a business account.`,
    ]},
    { h: "3. Bookings & payments", b: [
      `Professionals set their own services, prices, availability and cancellation policies. Customers book directly with the professional through the platform.`,
      `Where online payment is enabled, payments are processed by our third-party payment provider (Stripe). By making or accepting a payment you also agree to Stripe's terms. Bookrightly may charge subscription and/or transaction fees as described at sign-up or in your dashboard.`,
      `Refunds, rescheduling and no-show charges are governed by the relevant professional's stated policy. Disputes about a service should first be raised directly with the professional.`,
    ]},
    { h: "4. Acceptable use", b: [
      `You agree not to misuse the Service, including by attempting to gain unauthorised access, uploading unlawful or harmful content, infringing others' rights, or using the platform to send spam or fraudulent bookings.`,
      `We may suspend or terminate accounts that breach these Terms or that we reasonably believe present a risk to other users or to Bookrightly.`,
    ]},
    { h: "5. Subscriptions & cancellation", b: [
      `Business subscriptions renew automatically until cancelled. You can cancel at any time from your dashboard; cancellation takes effect at the end of the current billing period. Fees already paid are non-refundable except where required by law.`,
    ]},
    { h: "6. Your content", b: [
      `You retain ownership of the content you upload (such as logos, photos, service descriptions and reviews). You grant Bookrightly a licence to host and display that content for the purpose of operating the Service.`,
      `You are responsible for ensuring you have the rights to any content you upload and that it is accurate and lawful.`,
    ]},
    { h: "7. Availability & liability", b: [
      `We work to keep the Service available but do not guarantee it will be uninterrupted or error-free. To the fullest extent permitted by law, Bookrightly is not liable for indirect or consequential losses, or for the acts or omissions of professionals or customers using the platform.`,
      `Nothing in these Terms limits liability that cannot be limited by law.`,
    ]},
    { h: "8. Changes", b: [
      `We may update these Terms from time to time. If we make material changes we will take reasonable steps to notify you. Continued use of the Service after changes take effect constitutes acceptance.`,
    ]},
    { h: "9. Contact", b: [
      `Questions about these Terms can be sent to support@bookrightly.com.`,
    ]},
  ],
};

const PRIVACY = {
  title: "Privacy Policy",
  intro: `This Privacy Policy explains how Bookrightly collects, uses and protects your personal data when you use our platform. We are committed to handling your data responsibly and in line with the UK GDPR and Data Protection Act 2018.`,
  sections: [
    { h: "1. Data we collect", b: [
      `Account data: name, email, phone number, business details and login credentials.`,
      `Booking data: appointment details, service history and messages exchanged through the platform.`,
      `Payment data: processed securely by Stripe. We do not store full card numbers on our servers.`,
      `Usage data: device, browser and interaction information collected to operate and improve the Service.`,
    ]},
    { h: "2. How we use your data", b: [
      `To provide the Service — creating accounts, managing bookings, processing payments and enabling communication between professionals and customers.`,
      `To improve and secure the platform, prevent fraud, and provide customer support.`,
      `To send service-related notifications, and (where you have opted in) updates about features. You can opt out of marketing at any time.`,
    ]},
    { h: "3. Legal bases", b: [
      `We process personal data where necessary to perform our contract with you, where we have a legitimate interest in operating and improving the Service, to comply with legal obligations, or on the basis of your consent.`,
    ]},
    { h: "4. Sharing your data", b: [
      `We share data with service providers (sub-processors) who help us run the platform. Key sub-processors include:`,
      `Stripe — payment processing. Data shared: billing details and transaction amounts. Privacy: stripe.com/privacy`,
      `Google Firebase — database, authentication and hosting infrastructure. Data shared: account and booking data. Privacy: firebase.google.com/support/privacy`,
      `Cloudflare — content delivery, DDoS protection and DNS. Data shared: IP addresses and request metadata. Privacy: cloudflare.com/privacypolicy`,
      `Resend — used to send transactional booking confirmation emails. Data shared: client name, email, appointment details. Privacy: resend.com/privacy`,
      `Google Calendar API — used when professionals connect their Google Calendar to sync appointments. Data shared: client name, email, appointment date/time, and service type.`,
      `Bunny Fonts — used to load website fonts. Privacy-preserving CDN, no personal data collected. privacy.bunny.net`,
      `When you make a booking, relevant details are shared with the professional (or customer) you are transacting with, so the appointment can be fulfilled.`,
      `We do not sell your personal data.`,
    ]},
    { h: "5. Data retention", b: [
      `We keep personal data only for as long as needed to provide the Service and to meet legal, accounting and reporting obligations. You can request deletion of your account at any time.`,
    ]},
    { h: "6. Your rights", b: [
      `Under UK data protection law you have the right to access, correct, delete or restrict the processing of your personal data, to object to processing, and to data portability. To exercise these rights, contact us using the details below.`,
      `To request access to or deletion of your personal data, email privacy@bookrightly.co.uk with subject line 'Data Request'. We will respond within 30 days.`,
    ]},
    { h: "7. Security", b: [
      `We use industry-standard measures to protect your data, including encrypted connections and access controls. No system is completely secure, so we encourage you to use a strong, unique password.`,
    ]},
    { h: "8. Cookies", b: [
      `We use essential cookies to keep you signed in and to operate the platform, and may use analytics cookies to understand usage. You can control cookies through your browser settings.`,
    ]},
    { h: "9. Contact", b: [
      `For privacy questions or to exercise your rights, contact us at privacy@bookrightly.com. You also have the right to complain to the UK Information Commissioner's Office (ICO).`,
    ]},
  ],
};

export default function LegalPage({ kind = "terms" }) {
  const navigate = useNavigate();
  const data = kind === "privacy" ? PRIVACY : TERMS;

  useEffect(() => { window.scrollTo(0, 0); }, [kind]);

  return (
    <Box sx={{ bgcolor: G.warmWhite, minHeight: "100vh", fontFamily: SANS }}>
      {/* Header band */}
      <Box sx={{ bgcolor: G.dark, px: { xs: 2, md: 5 }, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md" disableGutters>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none", mb: 2, "&:hover": { color: G.gold, bgcolor: "transparent" } }}
          >
            Back to Bookrightly
          </Button>
          <Typography sx={{ fontFamily: SERIF, color: "#fff", fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 400, lineHeight: 1.1 }}>
            {data.title}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", mt: 1.5, letterSpacing: "0.04em" }}>
            Last updated {LAST_UPDATED}
          </Typography>
        </Container>
      </Box>

      {/* Body */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
        <Typography sx={{ color: "#3a3530", fontSize: "0.95rem", lineHeight: 1.85, mb: 4 }}>
          {data.intro}
        </Typography>

        {data.sections.map((s) => (
          <Box key={s.h} sx={{ mb: 4 }}>
            <Typography sx={{ fontFamily: SERIF, color: G.dark2, fontSize: "1.25rem", fontWeight: 600, mb: 1.5 }}>
              {s.h}
            </Typography>
            {s.b.map((para, i) => (
              <Typography key={i} sx={{ color: "#4a443d", fontSize: "0.92rem", lineHeight: 1.85, mb: 1.5 }}>
                {para}
              </Typography>
            ))}
          </Box>
        ))}

        <Box sx={{ borderTop: "1px solid #e8e2d8", pt: 3, mt: 2 }}>
          <Typography sx={{ color: "#9a8f7e", fontSize: "0.78rem", lineHeight: 1.7 }}>
            This page is provided for general information. Bookrightly recommends reviewing your own legal
            obligations for your business and jurisdiction.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
