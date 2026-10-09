import React, { useEffect, useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { Navigate, useLocation } from 'react-router-dom';
import { AD_CSS, getAdPage, renderAdPage } from '../ads/content.js';
import { captureAttribution, ensurePixel, trackAdEvent } from '../ads/tracking.js';

export default function AdLandingPage() {
  const location = useLocation();
  const root = useRef(null);
  const page = getAdPage(location.pathname);
  const html = useMemo(() => page ? renderAdPage(page, location.search) : '', [page, location.search]);
  useEffect(() => {
    if (!page) return;
    captureAttribution(location.search); ensurePixel();
    const element = root.current;
    const hero = element.querySelector('#ad-hero');
    const ad = element.querySelector('.br-ad');
    const observer = new IntersectionObserver(([entry]) => {
      ad.dataset.sticky = String(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(hero);
    const click = event => {
      const link = event.target.closest('[data-ad-cta]');
      if (link) trackAdEvent('Lead', { content_name: page.noun, content_category: page.type, plan: link.dataset.plan });
    };
    element.addEventListener('click', click);
    return () => { observer.disconnect(); element.removeEventListener('click', click); };
  }, [page, location.search]);
  if (!page) return <Navigate to="/" replace />;
  return <>
    <Helmet><title>Stop taking bookings in your DMs. | Bookrightly</title><meta name="robots" content="noindex"/><meta name="description" content={`Get your own free ${page.noun} booking page. Clients pick a time and book themselves — no back and forth.`}/><link rel="canonical" href={`https://bookrightly.co.uk${location.pathname.replace(/\/$/, '')}`}/><style>{AD_CSS}</style></Helmet>
    <Box ref={root} dangerouslySetInnerHTML={{ __html: html }} />
  </>;
}
