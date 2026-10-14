import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { LANDING_PAGES } from '../../seo/landingPages.js';
import { SEOHero, Section, SectionHead, FeatureCard, FAQSection, InternalLinks, BottomCTA, DARK, SANS } from './shared';

export default function FeaturePage() {
  const path = useLocation().pathname.replace(/\/+$/, '');
  const page = LANDING_PAGES[path];
  if (!page) return null;
  return (
    <Box sx={{ bgcolor: DARK, minHeight: '100vh', fontFamily: SANS }}>
      <SEOHero eyebrow={page.sources ? 'UK Booking Software Comparison' : 'Bookrightly Features'} title={page.h1} subtitle={page.intro} cta={page.cta.text} />
      <Section dark>
        <SectionHead eyebrow="What to expect" title="Choose the tools that fit your working day" />
        <Grid container spacing={3}>
          {page.features.map(({ h2, p }) => <Grid item xs={12} md={6} key={h2}><FeatureCard title={h2} body={p} /></Grid>)}
        </Grid>
      </Section>
      <Section>
        <SectionHead eyebrow="FAQ" title="Your questions answered" />
        <FAQSection faqs={page.faq} />
        {page.sources && <Box sx={{ mt: 4, color: '#696A73' }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 850, mb: 1 }}>Check the current provider information</Typography>
          <Typography sx={{ fontSize: '.85rem', mb: 1 }}>Comparison reviewed 14 October 2026. Provider prices, features and terms can change.</Typography>
          {page.sources.map((source) => <Box key={source.url} component="a" href={source.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block', mr: 3, mb: 1, color: '#2563EB', textDecoration: 'underline' }}>{source.label}</Box>)}
        </Box>}
      </Section>
      <Section><InternalLinks current={path} /></Section>
      <BottomCTA title="Try Bookrightly with your own workflow" sub="Start with Free, or try a paid plan for 90 days without card details. Choose the plan that includes the features you need." />
    </Box>
  );
}
