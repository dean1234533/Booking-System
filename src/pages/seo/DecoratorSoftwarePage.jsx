import React from "react";
import { Box, Grid } from "@mui/material";
import { SEOHero, Section, SectionHead, FeatureCard, StepCard, BottomCTA, FAQSection, DARK, SANS } from "./shared";

const FAQS = [
  { q: "Is Bookrightly free for decorators?", a: "Yes — 90-day free trial with no credit card required. After that it's £10/month with no commission on any booking or enquiry." },
  { q: "Can clients request a quote through my Bookrightly page?", a: "Yes. Clients fill in a quote request form describing the job, upload photos, and submit their contact details. You receive the enquiry by email and in your dashboard." },
  { q: "Can I show before and after photos of my work?", a: "Yes. Your Bookrightly profile includes a portfolio section where you can upload before and after images to show the quality of your finish." },
  { q: "What is the colour approval tool?", a: "Before work starts, you can send clients a digital colour palette to review and formally approve. This creates a record of sign-off and protects you if a client changes their mind after painting." },
  { q: "Can I book site visits through Bookrightly?", a: "Yes. You can add site visit slots so clients can book a convenient time for you to visit and provide an accurate quote — without back-and-forth calls." },
  { q: "Do clients need to create an account to submit a quote request?", a: "No. Clients submit the form directly on your page with no sign-up required." },
];

export default function DecoratorSoftwarePage() {
  return (
    <Box sx={{ bgcolor: DARK, color: "#fff", minHeight: "100vh", fontFamily: SANS }}>
      <SEOHero
        eyebrow="Decorator & Trades Software UK"
        title="Online booking and quoting software for UK decorators and tradespeople"
        subtitle="A professional portfolio page, quote request form, site visit booking, colour approval tool, and client reviews — all for £10/month. No commission, no marketplace."
        cta="Try free for 90 days"
      />

      <Section dark>
        <SectionHead
          eyebrow="Built for trades"
          title="Win more jobs before the first conversation"
          sub="Your Bookrightly page does the selling while you're on the tools. Clients see your work, request a quote, and book a site visit — all without picking up the phone."
        />
        <Grid container spacing={3}>
          {[
            ["🎨", "Before & after portfolio", "Upload transformation photos directly to your profile. Clients see your finish quality, your attention to detail, and the standard of your work before they even contact you."],
            ["📋", "Quote request form", "Clients describe the job, upload photos of the space, and submit their contact details. You receive a detailed enquiry with everything you need to provide an accurate quote."],
            ["📅", "Site visit booking", "Add available slots for site visits so clients can book a convenient time without calls or messages. Shows you're organised and professional from the first interaction."],
            ["🔵", "Digital colour approval", "Send clients a colour palette to review and formally approve before work starts. Creates a clear record and protects you from disputes about colour choice after the job is done."],
            ["⭐", "Client reviews", "Satisfied clients leave reviews on your Bookrightly profile. They show up on your public page and build trust for every new visitor who finds you."],
            ["📱", "Works on every device", "Your profile is fully responsive and can be installed as a PWA on any phone — clients find you and enquire from wherever they are."],
          ].map(([icon, title, body]) => (
            <Grid item xs={12} sm={6} md={4} key={title}>
              <FeatureCard icon={icon} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section>
        <SectionHead eyebrow="How it works" title="From sign-up to first enquiry in under an hour" />
        <Grid container spacing={3}>
          {[
            ["1", "Build your profile", "Add your business name, logo, service area, a short bio, and upload your portfolio photos. Your page is live the moment you save."],
            ["2", "Set up your quote form", "Customise the questions clients answer when requesting a quote. Job type, rooms, current condition — get the information you need upfront."],
            ["3", "Add site visit slots", "Open your calendar for site visits. Clients see real available times and book without any back-and-forth."],
            ["4", "Share your link", "Put your Bookrightly link in your Google Business profile, WhatsApp, and any local Facebook groups. Start receiving enquiries 24/7."],
          ].map(([number, title, body]) => (
            <Grid item xs={12} sm={6} key={title}>
              <StepCard number={number} title={title} body={body} />
            </Grid>
          ))}
        </Grid>
      </Section>

      <Section dark>
        <SectionHead eyebrow="FAQ" title="Questions about decorator booking software" />
        <Box sx={{ maxWidth: 700, mx: "auto" }}>
          <FAQSection faqs={FAQS} />
        </Box>
      </Section>

      <BottomCTA
        title="Win more decorating jobs from your phone"
        sub="90-day free trial. Flat £10/month after that. No commission, no marketplace, no surprises."
      />
    </Box>
  );
}
