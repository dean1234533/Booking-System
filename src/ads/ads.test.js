import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AD_PAGES, getAdPage, renderAdPage, signupHref } from './content.js';
import { captureAttribution, ensurePixel, trackAdEvent } from './tracking.js';
import { ALL_BUSINESS_TYPES } from '../config/plans.js';
import { LANDING_PAGES } from '../seo/landingPages.js';

describe('ad routes and server-rendered content', () => {
  it('covers every supported account type without adding indexed SEO routes', () => {
    expect(new Set(Object.values(AD_PAGES).map(p => p.type))).toEqual(new Set(ALL_BUSINESS_TYPES));
    for (const [slug, page] of Object.entries(AD_PAGES)) {
      expect(getAdPage(`/go/${slug}/`)).toBe(page);
      expect(LANDING_PAGES[`/go/${slug}`]).toBeUndefined();
      const html = renderAdPage(page);
      expect(html).toContain('Stop taking bookings in your DMs.');
      expect(html).toContain(`/images/ads/${slug}.webp`);
      expect(html.match(/<details>/g)).toHaveLength(5);
      expect(html).not.toContain('/booking-software/');
      expect(html).toContain(`type=${page.type}&amp;plan=free`);
    }
  });
  it('keeps UTM parameters and click ID while protecting the selected account type and plan', () => {
    const url = new URL(signupHref(AD_PAGES.salons, '?utm_source=facebook&utm_campaign=A%26B&utm_content=reel&fbclid=click&type=barber&plan=full'), 'https://example.test');
    expect(Object.fromEntries(url.searchParams)).toEqual({type:'hairdresser',plan:'free',ad:'1',utm_source:'facebook',utm_campaign:'A&B',utm_content:'reel',fbclid:'click'});
    const html = renderAdPage(AD_PAGES.salons, '?utm_content=%22%3E%3Cscript%3E');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Get your own free salon booking page. Clients pick a time and book themselves — no back and forth.');
  });
  it('supports Full signup without changing the Free default', () => {
    expect(signupHref(AD_PAGES.decorators, '', 'full')).toContain('type=decorator&plan=full');
    expect(signupHref(AD_PAGES.decorators)).toContain('plan=free');
    expect(getAdPage('/go/unknown')).toBeUndefined();
  });
});

describe('campaign persistence and Meta events', () => {
  let storage;
  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('sessionStorage', {getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)});
    vi.stubGlobal('window', {location:{search:''}, fbq: vi.fn()});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('keeps attribution across ad, signup and onboarding navigation', () => {
    const campaign={utm_source:'facebook',utm_campaign:'salons',utm_content:'video'};
    expect(captureAttribution('?utm_source=facebook&utm_campaign=salons&utm_content=video')).toEqual(campaign);
    expect(captureAttribution('')).toEqual(campaign);
  });
  it('replaces campaigns without combining unrelated content tags', () => {
    captureAttribution('?utm_source=facebook&utm_campaign=first&utm_content=video');
    expect(captureAttribution('?utm_source=facebook&utm_campaign=second')).toEqual({utm_source:'facebook',utm_campaign:'second'});
  });
  it('works when storage is unavailable or has malformed values', () => {
    storage.set('br_ad_attribution_v1', 'null');
    expect(captureAttribution('')).toEqual({});
    vi.stubGlobal('sessionStorage', {getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}});
    expect(captureAttribution('?utm_source=facebook')).toEqual({utm_source:'facebook'});
  });
  it('does not double-fire PageView when the existing pixel is initialized', () => {
    ensurePixel();
    expect(window.fbq).not.toHaveBeenCalled();
    trackAdEvent('Lead',{content_category:'hairdresser'});
    expect(window.fbq).toHaveBeenCalledExactlyOnceWith('track','Lead',{content_category:'hairdresser'});
  });
  it('initializes the environment pixel fallback once and sends conversions', () => {
    window.fbq=undefined;
    vi.stubEnv('VITE_META_PIXEL_ID','123456');
    vi.stubGlobal('document',{createElement:()=>({}),head:{append:vi.fn()}});
    ensurePixel(); ensurePixel();
    expect(document.head.append).toHaveBeenCalledTimes(1);
    trackAdEvent('CompleteRegistration');
    expect(window.fbq.queue.map(args=>Array.from(args))).toEqual([['init','123456'],['track','PageView'],['track','CompleteRegistration',{}]]);
  });
});
