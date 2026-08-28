import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  X,
} from "lucide-react";
import {
  BoilerMark,
  CompletedJobsMark,
  ConsumerUnitMark,
  CoverageMark,
  CraftMark,
  CustomerLaurelMark,
  ExperienceMark,
  InsuranceMark,
  PipeworkMark,
  RapidResponseMark,
} from "../components/icons/PremiumTradeIcons";
import { db } from "../firebase/config";
import { createNotification, uploadEnquiryPhoto } from "../firebase/firestore";
import { getFontFamily, loadGoogleFont } from "../utils/fontOptions";
import { getWhatsAppBookingUrl } from "../utils/whatsapp";
import { PLUMBER_SERVICE_CATEGORIES, URGENCY_LEVELS } from "../utils/tradeJobs";
import BeforeAfterSlider from "../components/BeforeAfterSlider";
import { heroForProfile, portfolioForProfile } from "../data/demoPortfolios";
import "../styles/plumber-v2.css";

const CATEGORY_ICONS = {
  Plumbing: PipeworkMark,
  "Gas & Heating": BoilerMark,
  Electrical: ConsumerUnitMark,
};
const CATEGORY_IMAGES = {
  Plumbing: "/images/plumber/service-plumbing-v2.jpg",
  "Gas & Heating": "/images/plumber/service-heating-v2.jpg",
  Electrical: "/images/plumber/service-electrical-v2.jpg",
};
const LEGACY_IMAGE_UPGRADES = {
  "/images/plumber/plumber-hero.jpg": "/images/plumber/plumber-hero-v2.jpg",
  "/images/plumber/service-plumbing.jpg":
    "/images/plumber/service-plumbing-v2.jpg",
  "/images/plumber/service-heating.jpg":
    "/images/plumber/service-heating-v2.jpg",
  "/images/plumber/service-electrical.jpg":
    "/images/plumber/service-electrical-v2.jpg",
};

function upgradedImage(image, fallback) {
  return LEGACY_IMAGE_UPGRADES[image] || image || fallback;
}

function externalUrl(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function readableForeground(hex) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? "#0b1723" : "#ffffff";
}

// The brand colour is also used as accent *text* (kickers, prices) on the
// template's fixed dark navy sections — a dark brand colour disappears
// there, so fall back to white when it's too dark to read against navy.
function readableAccentOnNavy(hex) {
  const value = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 90 ? hex : "#ffffff";
}

function ServiceCard({ category, defaultOpen = false, onSelectService }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = CATEGORY_ICONS[category.category] || CraftMark;
  const image = upgradedImage(
    category.image,
    CATEGORY_IMAGES[category.category] || CATEGORY_IMAGES.Plumbing,
  );
  // Skip rows saved with no name — an owner who started adding a service and
  // didn't finish would otherwise show a blank row (just a number and an
  // Enquire button) instead of nothing.
  const items = (Array.isArray(category.items) ? category.items : []).filter(item => item.name?.trim());
  return (
    <article className={`trade-service-card${open ? " open" : ""}`}>
      <div className="trade-service-image-wrap">
        <img
          className="trade-service-image"
          src={image}
          alt={`${category.category} service`}
          loading="lazy"
        />
        <span className="trade-service-image-icon">
          <Icon size={21} />
        </span>
      </div>
      <button
        className="trade-service-head"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="trade-service-heading">
          <span>
            <strong>{category.category}</strong>
            <small>
              {items.length
                ? `${items.length} services`
                : "Tell us what you need"}
            </small>
          </span>
        </span>
        <span className="trade-service-toggle">
          <span className="trade-service-toggle-label">
            {open ? "Close" : "View services"}
          </span>
          <span className={`trade-service-toggle-icon${open ? " open" : ""}`}>
            <ChevronDown size={17} />
          </span>
        </span>
      </button>
      {open && (
        <div className="trade-service-body">
          {items.length ? (
            items.map((item, index) => (
              <div className="trade-service-item" key={`${item.name}-${index}`}>
                <span className="trade-service-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="trade-service-item-content">
                  <div className="trade-service-row">
                    <strong>{item.name}</strong>
                    {item.startingPrice && (
                      <span className="trade-service-price">
                        From £{item.startingPrice}
                      </span>
                    )}
                  </div>
                  {item.description && <p>{item.description}</p>}
                  <button
                    type="button"
                    className={`trade-service-badge${item.bookableOnline ? " bookable" : ""}`}
                    onClick={() => onSelectService?.(category.category, item)}
                  >
                    Enquire now
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="trade-service-empty">
              Describe the work in the request form and the business will
              confirm whether they can help.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function PlumberTemplateV2({ tenantData = {} }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [team, setTeam] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [enquiryStatus, setEnquiryStatus] = useState("idle");
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiry, setEnquiry] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    postcode: "",
    serviceCategory: "",
    problemDescription: "",
    urgency: "routine",
    preferredDate: "",
    preferredTime: "",
    confirmed: false,
  });

  const tenantId = tenantData.id || tenantData.uid;
  const brandColor = tenantData.brandColor || "#2563eb";
  const fontKey = tenantData.siteFont;
  const displayFont = getFontFamily(fontKey, "playfair");
  const businessName =
    tenantData.businessName || tenantData.name || "Local trade professional";
  const logo = tenantData.businessLogo || tenantData.logoUrl || tenantData.logo;
  const phone = tenantData.phone || tenantData.businessPhone || "";
  const email =
    tenantData.businessEmail ||
    tenantData.contactEmail ||
    tenantData.email ||
    "";
  const location =
    tenantData.location || tenantData.city || tenantData.address || "";
  const googleBusinessUrl =
    externalUrl(
      tenantData.googleBusinessUrl ||
        tenantData.googleReviewsUrl ||
        tenantData.googleBusinessProfileUrl,
    ) ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName} ${location}`.trim())}`;
  const heroImage = heroForProfile(
    tenantData,
    LEGACY_IMAGE_UPGRADES[tenantData.heroImage || tenantData.heroImageDesktop] || tenantData.heroImage || tenantData.heroImageDesktop,
  ) || "/images/plumber/plumber-hero-v2.jpg";
  const whatsappUrl = getWhatsAppBookingUrl(
    tenantData.whatsappNumber,
    businessName,
  );
  const heroLine1 = tenantData.heroHeadingLine1 || "Local work.";
  const heroLine2 = tenantData.heroHeadingLine2 || "Done properly.";
  const heroSub =
    tenantData.heroSubtext ||
    "Plumbing, heating and electrical work with a clear route from first request to finished job.";
  const aboutHeading =
    tenantData.aboutHeading || "Straight answers. Careful work.";
  const aboutBody =
    tenantData.aboutBody ||
    tenantData.aboutUs ||
    "Tell us what needs doing and we’ll get back to you with the next step, availability and pricing before anything is booked.";
  const serviceAreas = Array.isArray(tenantData.serviceAreas)
    ? tenantData.serviceAreas.filter(Boolean)
    : [];
  const pageCopy = {
    heroTagline:
      tenantData.heroTagline || location || "Plumbing, heating & electrical",
    heroCardHeading: tenantData.heroReviewText || "What can we help with?",
    heroCardBody:
      tenantData.heroCardBody ||
      "Choose a service, describe the job and add photos. We’ll use those details to plan the next step.",
    primaryCta: tenantData.primaryCtaLabel || "Request a job",
    servicesTagline: tenantData.servicesTagline || "Services",
    servicesHeading:
      tenantData.servicesHeading || "The right help for the job.",
    servicesBody:
      tenantData.servicesBody ||
      "Browse the work offered, then send the details of what you need. Enquiry-only services are confirmed before a date or price is agreed.",
    aboutTagline: tenantData.aboutTagline || "About the business",
    areasTagline: tenantData.areasTagline || "Areas covered",
    areasHeading:
      tenantData.areasHeading ||
      (serviceAreas.length
        ? "Working across your local area."
        : "Not sure if you’re covered?"),
    areasBody:
      tenantData.areasBody ||
      (serviceAreas.length
        ? "We provide plumbing, heating and electrical services across the areas below."
        : "Send your postcode with the job request and the business will confirm coverage."),
    areasCta: tenantData.areasCtaLabel || "Check your postcode",
    chargesTagline: tenantData.chargesTagline || "Price guide",
    chargesHeading:
      tenantData.chargesHeading || "Standard charges, clearly shown.",
    chargesBody:
      tenantData.chargesBody ||
      "These are guide charges entered by the business. A final price is confirmed after the job details are understood.",
    teamTagline: tenantData.teamTagline || "The team",
    teamHeading: tenantData.teamHeading || "The people doing the work.",
    reviewsTagline: tenantData.reviewsTagline || "Customer feedback",
    reviewsHeading: tenantData.reviewsHeading || "What customers say.",
    requestTagline: tenantData.requestTagline || "Request a job",
    requestHeading: tenantData.requestHeading || "Tell us what’s happening.",
    requestBody:
      tenantData.requestBody ||
      "Send the key details now. The business will review them and contact you to confirm the next step.",
  };
  const requestSteps = [
    tenantData.requestStep1 || "Share your contact and property details.",
    tenantData.requestStep2 || "Describe the job and add useful photos.",
    tenantData.requestStep3 ||
      "Wait for confirmation of availability and price.",
  ];
  const configuredCategories =
    Array.isArray(tenantData.serviceCategories) &&
    tenantData.serviceCategories.length
      ? tenantData.serviceCategories
      : PLUMBER_SERVICE_CATEGORIES.map(({ category }) => ({
          category,
          items: [],
        }));
  const portfolioItems = portfolioForProfile(
    tenantData,
    Array.isArray(tenantData.portfolioItems) ? tenantData.portfolioItems : [],
  );
  const charges = tenantData.standardCharges || {};
  const chargeRows = [
    ["Call-out fee", charges.calloutFee],
    ["Hourly rate", charges.hourlyRate],
    ["Minimum charge", charges.minimumCharge],
    ["Diagnostic fee", charges.diagnosticFee],
    ["Emergency / out-of-hours", charges.emergencyRate],
  ].filter(([, value]) => value !== "" && value != null);
  const currentReview = reviews[reviewIndex];
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) /
      reviews.length
    : null;
  const emergencyEnabled = Boolean(
    tenantData.emergencyCallouts || tenantData.emergencyAvailable,
  );
  const privacyText =
    tenantData.privacyPolicy ||
    `At ${businessName}, we collect only the information needed to respond to your enquiry and do not sell your data.`;
  const termsText =
    tenantData.termsConditions ||
    `Submitting a job request is not a confirmed appointment. ${businessName} will confirm availability, scope and price before work is booked.`;

  useEffect(() => {
    if (fontKey) loadGoogleFont(fontKey);
  }, [fontKey]);

  useEffect(() => {
    if (tenantId)
      localStorage.setItem(
        "active_tenant_branding",
        JSON.stringify(tenantData),
      );
  }, [tenantData, tenantId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!tenantId) return;
    Promise.all([
      getDocs(collection(db, "barbers", tenantId, "reviews")),
      getDocs(collection(db, "barbers", tenantId, "staff")),
    ])
      .then(([reviewSnap, staffSnap]) => {
        setReviews(
          reviewSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
        );
        setTeam(
          staffSnap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .filter((member) => member.name),
        );
      })
      .catch((error) =>
        console.error("Unable to load public profile details", error),
      );
  }, [tenantId]);

  const trustItems = useMemo(() => {
    const statIcons = [
      ExperienceMark,
      CompletedJobsMark,
      CustomerLaurelMark,
      RapidResponseMark,
    ];
    const customStats = [1, 2, 3, 4]
      .map((number, index) => ({
        icon: statIcons[index],
        title: tenantData[`stat${number}Value`],
        detail: tenantData[`stat${number}Label`],
      }))
      .filter((item) => item.title || item.detail);
    if (customStats.length) return customStats;
    const items = [];
    if (averageRating)
      items.push({
        icon: CustomerLaurelMark,
        title: `${averageRating.toFixed(1)} from ${reviews.length} review${reviews.length === 1 ? "" : "s"}`,
        detail: "Customer feedback",
      });
    if (serviceAreas.length)
      items.push({
        icon: CoverageMark,
        title: `${serviceAreas.length} area${serviceAreas.length === 1 ? "" : "s"} covered`,
        detail: serviceAreas.slice(0, 2).join(" · "),
      });
    if (tenantData.openingHours)
      items.push({
        icon: RapidResponseMark,
        title: "Working hours available",
        detail: "See contact details below",
      });
    if (tenantData.insured || tenantData.insuranceText)
      items.push({
        icon: InsuranceMark,
        title: tenantData.insuranceText || "Insured",
        detail: "Business-provided information",
      });
    if (!items.length)
      items.push({
        icon: CompletedJobsMark,
        title: "Request first, confirm next",
        detail: "Nothing is booked until details are agreed",
      });
    return items;
  }, [averageRating, reviews.length, serviceAreas, tenantData]);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const selectServiceForEnquiry = (categoryName, item) => {
    setEnquiryStatus("idle");
    setEnquiry((current) => ({
      ...current,
      serviceCategory: categoryName,
      problemDescription:
        current.problemDescription || `I’d like help with ${item.name}.`,
    }));
    scrollTo("request");
    window.setTimeout(
      () => document.getElementById("trade-description")?.focus(),
      500,
    );
  };

  function selectPhotos(event) {
    const files = Array.from(event.target.files || []).slice(
      0,
      Math.max(0, 5 - photos.length),
    );
    setPhotos((current) =>
      [
        ...current,
        ...files.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ].slice(0, 5),
    );
    event.target.value = "";
  }

  function removePhoto(index) {
    setPhotos((current) =>
      current.filter((photo, photoIndex) => {
        if (photoIndex === index) URL.revokeObjectURL(photo.previewUrl);
        return photoIndex !== index;
      }),
    );
  }

  async function submitEnquiry(event) {
    event.preventDefault();
    if (!tenantId) {
      setEnquiryStatus("error");
      setEnquiryError("Business not found. Please try again.");
      return;
    }
    if (!enquiry.confirmed) {
      setEnquiryStatus("error");
      setEnquiryError(
        "Please confirm that you understand this is a request, not a booked appointment.",
      );
      return;
    }
    setEnquiryStatus("sending");
    setEnquiryError("");
    try {
      const enquiryRef = doc(collection(db, "barbers", tenantId, "enquiries"));
      const photoUrls = await Promise.all(
        photos.map((photo) =>
          uploadEnquiryPhoto(photo.file, tenantId, enquiryRef.id),
        ),
      );
      const { confirmed: _confirmed, ...enquiryData } = enquiry;
      await setDoc(enquiryRef, {
        ...enquiryData,
        photoUrls,
        status: "new",
        notes: [],
        submittedAt: serverTimestamp(),
        read: false,
      });
      createNotification(tenantId, {
        type: "enquiry",
        title: "New job request",
        body: `${enquiry.name} requested a job${enquiry.serviceCategory ? ` (${enquiry.serviceCategory})` : ""}${enquiry.urgency === "emergency" ? " — marked emergency" : ""}.`,
        data: { enquiryId: enquiryRef.id },
      }).catch(() => {});
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      setEnquiry({
        name: "",
        phone: "",
        email: "",
        address: "",
        postcode: "",
        serviceCategory: "",
        problemDescription: "",
        urgency: "routine",
        preferredDate: "",
        preferredTime: "",
        confirmed: false,
      });
      setEnquiryStatus("success");
    } catch (error) {
      console.error(error);
      setEnquiryStatus("error");
      setEnquiryError(
        "Your request could not be sent. Please try again or contact the business directly.",
      );
    }
  }

  const navLinks = [
    ["services", "Services"],
    ...(portfolioItems.length ? [["portfolio", "Before & after"]] : []),
    ["about", "About"],
    ...(chargeRows.length ? [["charges", "Charges"]] : []),
    ...(serviceAreas.length ? [["areas", "Areas"]] : []),
    ["reviews", "Reviews"],
    ["request", pageCopy.primaryCta],
  ];

  return (
    <div
      className="trade-site"
      style={{
        "--trade": brandColor,
        "--trade-ink": readableForeground(brandColor),
        "--trade-on-navy": readableAccentOnNavy(brandColor),
        "--trade-display": displayFont,
        "--nav-bg": tenantData.navBgColor || "#f2eee6",
        "--nav-ink": readableForeground(tenantData.navBgColor || "#f2eee6"),
        "--footer-bg": tenantData.footerBgColor || "#061019",
        "--footer-ink": readableForeground(
          tenantData.footerBgColor || "#061019",
        ),
      }}
    >
      <nav className="trade-nav" aria-label="Business navigation">
        <div className="trade-shell trade-nav-inner">
          <a
            className="trade-brand"
            href="#top"
            onClick={(event) => {
              event.preventDefault();
              scrollTo("top");
            }}
          >
            <span className="trade-logo">
              {logo ? (
                <img src={logo} alt="" />
              ) : (
                businessName.charAt(0).toUpperCase()
              )}
            </span>
            <span className="trade-brand-name">{businessName}</span>
          </a>
          <div className="trade-nav-links">
            {navLinks.slice(0, -1).map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollTo(id);
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="trade-nav-actions">
            {phone && (
              <a
                className="trade-button trade-button-outline"
                href={`tel:${phone}`}
              >
                <Phone size={16} />
                Call
              </a>
            )}
            <button
              className="trade-button trade-button-primary"
              type="button"
              onClick={() => scrollTo("request")}
            >
              {pageCopy.primaryCta}
              <ArrowRight size={16} />
            </button>
          </div>
          <button
            className={`trade-menu${mobileMenuOpen ? " open" : ""}`}
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>
      <div
        className={`trade-mobile-menu${mobileMenuOpen ? " open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="trade-shell trade-mobile-menu-inner">
          <div className="trade-mobile-menu-intro">
            <span>Navigation</span>
            <strong>How can we help?</strong>
          </div>
          <div className="trade-mobile-menu-links">
            {navLinks.slice(0, -1).map(([id, label], index) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollTo(id);
                }}
              >
                <span className="trade-mobile-menu-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{label}</span>
                <ArrowRight size={18} />
              </a>
            ))}
          </div>
          <div className="trade-mobile-menu-footer">
            <p>
              Clear information, straightforward requests and no automatic
              booking.
            </p>
            <div>
              {phone && (
                <a
                  className="trade-button trade-button-menu-call"
                  href={`tel:${phone}`}
                >
                  <Phone size={16} />
                  Call {phone}
                </a>
              )}
              <button
                className="trade-button trade-button-primary"
                type="button"
                onClick={() => scrollTo("request")}
              >
                {pageCopy.primaryCta}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main>
        <header className="trade-hero" id="top">
          <div className="trade-shell trade-hero-grid">
            <div>
              <div className="trade-location">
                <MapPin size={16} />
                {pageCopy.heroTagline}
              </div>
              <h1>
                {heroLine1}
                <br />
                <span>{heroLine2}</span>
              </h1>
              <p className="trade-hero-copy">{heroSub}</p>
              {emergencyEnabled && (
                <p className="trade-kicker" style={{ marginTop: 18 }}>
                  Emergency call-outs available
                </p>
              )}
              <div className="trade-hero-actions">
                <button
                  className="trade-button trade-button-primary"
                  type="button"
                  onClick={() => scrollTo("request")}
                >
                  {pageCopy.primaryCta}
                  <ArrowRight size={17} />
                </button>
                {phone && (
                  <a
                    className="trade-button trade-button-dark"
                    href={`tel:${phone}`}
                  >
                    <Phone size={17} />
                    Call {phone}
                  </a>
                )}
                {whatsappUrl && (
                  <a
                    className="trade-button trade-button-outline"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={17} />
                    WhatsApp
                  </a>
                )}
              </div>
              <div className="trade-hero-facts">
                <span className="trade-hero-fact">
                  <CheckCircle2 size={15} />
                  {tenantData.heroTrustText || "Request first—nothing booked automatically"}
                </span>
                {serviceAreas.length > 0 && (
                  <span className="trade-hero-fact">
                    <MapPin size={15} />
                    {serviceAreas.slice(0, 3).join(" · ")}
                  </span>
                )}
              </div>
            </div>
            <div className="trade-visual">
              <img src={heroImage} alt={`${businessName} plumbing service`} />
              <div className="trade-visual-card">
                <strong>{pageCopy.heroCardHeading}</strong>
                <p>{pageCopy.heroCardBody}</p>
                <div className="trade-category-row">
                  {configuredCategories.slice(0, 3).map((category) => {
                    const Icon = CATEGORY_ICONS[category.category] || CraftMark;
                    return (
                      <div
                        className="trade-category-mini"
                        key={category.category}
                      >
                        <Icon size={17} />
                        {category.category}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="trade-trust" aria-label="Business information">
          <div className="trade-shell trade-trust-grid">
            {trustItems.map(({ icon: Icon, title, detail }) => (
              <div className="trade-trust-item" key={title}>
                <span className="trade-trust-icon">
                  <Icon size={22} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="trade-section trade-services" id="services">
          <div className="trade-shell">
            <div className="trade-section-head">
              <div>
                <span className="trade-kicker">{pageCopy.servicesTagline}</span>
                <h2 className="trade-title">{pageCopy.servicesHeading}</h2>
              </div>
              <p className="trade-copy">{pageCopy.servicesBody}</p>
            </div>
            <div className="trade-service-grid">
              {configuredCategories.map((category, index) => (
                <ServiceCard
                  category={category}
                  defaultOpen={index === 0}
                  onSelectService={selectServiceForEnquiry}
                  key={category.category}
                />
              ))}
            </div>
          </div>
        </section>

        {portfolioItems.length > 0 && (
          <section className="trade-section trade-portfolio" id="portfolio">
            <div className="trade-shell">
              <div className="trade-section-head">
                <div>
                  <span className="trade-kicker">Recent work</span>
                  <h2 className="trade-title">
                    {tenantData.portfolioHeading || "Repairs you can see."}
                  </h2>
                </div>
                <p className="trade-copy">
                  {tenantData.portfolioSubtext ||
                    "Drag each slider to compare the condition before and after professional repair."}
                </p>
              </div>
              <div className="trade-portfolio-grid">
                {portfolioItems.map((item, index) => (
                  <article className="trade-portfolio-item" key={`${item.label || "job"}-${index}`}>
                    <BeforeAfterSlider before={item.before} after={item.after} aspectRatio="4/5" radius={3} />
                    {item.label && <h3>{item.label}</h3>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="trade-section trade-about" id="about">
          <div className="trade-shell trade-about-grid">
            <div>
              <span className="trade-kicker">{pageCopy.aboutTagline}</span>
              <h2 className="trade-title">{aboutHeading}</h2>
              <p className="trade-copy" style={{ marginTop: 22 }}>
                {aboutBody}
              </p>
              <div className="trade-contact-list">
                {phone && (
                  <a className="trade-contact-link" href={`tel:${phone}`}>
                    <Phone size={18} color={brandColor} />
                    {phone}
                  </a>
                )}
                {email && (
                  <a className="trade-contact-link" href={`mailto:${email}`}>
                    <Mail size={18} color={brandColor} />
                    {email}
                  </a>
                )}
                {location && (
                  <span className="trade-contact-link">
                    <MapPin size={18} color={brandColor} />
                    {location}
                  </span>
                )}
              </div>
            </div>
            <div className="trade-about-panel" id={serviceAreas.length ? "areas" : undefined}>
              <span className="trade-kicker">{pageCopy.areasTagline}</span>
              <h3
                style={{
                  margin: "10px 0 0",
                  fontSize: "2rem",
                  letterSpacing: "-.04em",
                }}
              >
                {pageCopy.areasHeading}
              </h3>
              <p className="trade-copy" style={{ marginTop: 14 }}>
                {pageCopy.areasBody}
              </p>
              {serviceAreas.length > 0 && (
                <div className="trade-area-chips">
                  {serviceAreas.map((area) => (
                    <span className="trade-area-chip" key={area}>
                      {area}
                    </span>
                  ))}
                </div>
              )}
              {(tenantData.serviceRadius || tenantData.travelChargeNote) && (
                <p
                  className="trade-copy"
                  style={{ marginTop: 20, fontSize: ".74rem" }}
                >
                  {tenantData.serviceRadius &&
                    `${tenantData.serviceRadius} service radius. `}
                  {tenantData.travelChargeNote}
                </p>
              )}
              <button
                className="trade-button trade-button-primary"
                type="button"
                style={{ marginTop: 24 }}
                onClick={() => scrollTo("request")}
              >
                {pageCopy.areasCta}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {chargeRows.length > 0 && (
          <section className="trade-section trade-pricing" id="charges">
            <div className="trade-shell">
              <div className="trade-section-head">
                <div>
                  <span className="trade-kicker">
                    {pageCopy.chargesTagline}
                  </span>
                  <h2 className="trade-title">{pageCopy.chargesHeading}</h2>
                </div>
                <p className="trade-copy">{pageCopy.chargesBody}</p>
              </div>
              <div className="trade-price-list">
                {chargeRows.map(([label, value]) => (
                  <div className="trade-price-row" key={label}>
                    <span>{label}</span>
                    <strong>£{value}</strong>
                  </div>
                ))}
              </div>
              {charges.extraNote && (
                <p className="trade-price-note">{charges.extraNote}</p>
              )}
            </div>
          </section>
        )}

        {team.length > 0 && (
          <section className="trade-section">
            <div className="trade-shell">
              <span className="trade-kicker">{pageCopy.teamTagline}</span>
              <h2 className="trade-title">{pageCopy.teamHeading}</h2>
              <div className="trade-team-grid">
                {team.map((member) => (
                  <article className="trade-team-card" key={member.id}>
                    {member.profilePic ? (
                      <img
                        className="trade-team-photo"
                        src={member.profilePic}
                        alt={member.name}
                      />
                    ) : (
                      <div className="trade-team-placeholder">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <strong>{member.name}</strong>
                    <span>
                      {member.role || member.specialty || "Trade professional"}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="trade-section trade-reviews" id="reviews">
          <div className="trade-shell">
            <span className="trade-kicker">{pageCopy.reviewsTagline}</span>
            <h2 className="trade-title">{pageCopy.reviewsHeading}</h2>
            <div className="trade-review-wrap">
              <div className="trade-review-score">
                <div>
                  <strong>{averageRating ? averageRating.toFixed(1) : "Google"}</strong>
                  <div className="trade-stars">
                    {[0, 1, 2, 3, 4].map((item) => (
                      <Star key={item} size={17} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <div className="trade-review-score-footer">
                  <span>
                    {reviews.length
                      ? `${reviews.length} verified review${reviews.length === 1 ? "" : "s"}`
                      : "Customer feedback on Google"}
                  </span>
                  <a
                    className="trade-google-reviews"
                    href={googleBusinessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View reviews on Google
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
              <div>
                <article className="trade-review-card">
                  <div className="trade-stars" style={{ color: brandColor }}>
                    {Array.from({
                      length: Number(currentReview?.rating || 5),
                    }).map((_, item) => (
                      <Star key={item} size={17} fill="currentColor" />
                    ))}
                  </div>
                  {currentReview ? (
                    <>
                      <blockquote>“{currentReview.comment}”</blockquote>
                      <span className="trade-review-byline">
                        {currentReview.customerName || "Customer"} · Verified customer
                      </span>
                    </>
                  ) : (
                    <>
                      <blockquote>Read what customers say about {businessName}.</blockquote>
                      <a
                        className="trade-review-empty-link"
                        href={googleBusinessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open Google Reviews
                        <ArrowRight size={16} />
                      </a>
                    </>
                  )}
                </article>
                {reviews.length > 1 && (
                  <div className="trade-review-nav">
                    <button
                      className="trade-icon-button"
                      type="button"
                      aria-label="Previous review"
                      onClick={() =>
                        setReviewIndex(
                          (index) => (index - 1 + reviews.length) % reviews.length,
                        )
                      }
                    >
                      <ChevronLeft />
                    </button>
                    <button
                      className="trade-icon-button"
                      type="button"
                      aria-label="Next review"
                      onClick={() =>
                        setReviewIndex((index) => (index + 1) % reviews.length)
                      }
                    >
                      <ChevronRight />
                    </button>
                    <span className="trade-copy" style={{ fontSize: ".72rem" }}>
                      {reviewIndex + 1} of {reviews.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="trade-section trade-request" id="request">
          <div className="trade-shell trade-request-grid">
            <aside className="trade-request-info">
              <span className="trade-kicker">{pageCopy.requestTagline}</span>
              <h2 className="trade-title">{pageCopy.requestHeading}</h2>
              <p className="trade-copy" style={{ marginTop: 18 }}>
                {pageCopy.requestBody}
              </p>
              <div className="trade-process">
                {requestSteps.map((copy, index) => (
                  <div className="trade-process-step" key={`${index}-${copy}`}>
                    <span className="trade-process-num">{index + 1}</span>
                    <span>{copy}</span>
                  </div>
                ))}
              </div>
              {phone && (
                <a
                  className="trade-button trade-button-primary"
                  href={`tel:${phone}`}
                  style={{ marginTop: 30 }}
                >
                  <Phone size={16} />
                  Prefer to call?
                </a>
              )}
            </aside>
            <div className="trade-form">
              {enquiryStatus === "success" ? (
                <div className="trade-success">
                  <CheckCircle2 size={54} color={brandColor} />
                  <h3 style={{ margin: "18px 0 8px", fontSize: "1.45rem" }}>
                    Your request has been sent.
                  </h3>
                  <p className="trade-copy">
                    It is not a confirmed appointment yet. {businessName} will
                    contact you to confirm the details, availability and price.
                  </p>
                  <button
                    className="trade-button trade-button-outline"
                    type="button"
                    style={{ marginTop: 18 }}
                    onClick={() => setEnquiryStatus("idle")}
                  >
                    Send another request
                  </button>
                </div>
              ) : (
                <form onSubmit={submitEnquiry}>
                  <div className="trade-form-section">
                    <h3 className="trade-form-heading">Your details</h3>
                    <div className="trade-form-grid">
                      <div className="trade-field">
                        <label htmlFor="trade-name">Full name</label>
                        <input
                          id="trade-name"
                          className="trade-input"
                          required
                          autoComplete="name"
                          value={enquiry.name}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              name: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field">
                        <label htmlFor="trade-phone">Phone number</label>
                        <input
                          id="trade-phone"
                          className="trade-input"
                          type="tel"
                          required
                          autoComplete="tel"
                          value={enquiry.phone}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              phone: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field">
                        <label htmlFor="trade-email">Email (optional)</label>
                        <input
                          id="trade-email"
                          className="trade-input"
                          type="email"
                          autoComplete="email"
                          value={enquiry.email}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              email: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field">
                        <label htmlFor="trade-postcode">Postcode</label>
                        <input
                          id="trade-postcode"
                          className="trade-input"
                          autoComplete="postal-code"
                          value={enquiry.postcode}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              postcode: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field full">
                        <label htmlFor="trade-address">Property address</label>
                        <input
                          id="trade-address"
                          className="trade-input"
                          autoComplete="street-address"
                          value={enquiry.address}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              address: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="trade-form-section">
                    <h3 className="trade-form-heading">The job</h3>
                    <div className="trade-form-grid">
                      <div className="trade-field full">
                        <label htmlFor="trade-category">Service</label>
                        <select
                          id="trade-category"
                          className="trade-input"
                          value={enquiry.serviceCategory}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              serviceCategory: event.target.value,
                            }))
                          }
                        >
                          <option value="">Choose a service category</option>
                          {configuredCategories.map((category) => (
                            <option
                              value={category.category}
                              key={category.category}
                            >
                              {category.category}
                            </option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="trade-field full">
                        <label htmlFor="trade-description">
                          What needs doing?
                        </label>
                        <textarea
                          id="trade-description"
                          className="trade-input"
                          required
                          placeholder="Describe the problem, what you have noticed, and anything that may help…"
                          value={enquiry.problemDescription}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              problemDescription: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field full">
                        <span className="trade-field-label">
                          How soon do you need help?
                        </span>
                        <div className="trade-urgency">
                          {URGENCY_LEVELS.map((level) => (
                            <label
                              className="trade-urgency-option"
                              key={level.value}
                            >
                              <input
                                type="radio"
                                name="urgency"
                                value={level.value}
                                checked={enquiry.urgency === level.value}
                                onChange={(event) =>
                                  setEnquiry((value) => ({
                                    ...value,
                                    urgency: event.target.value,
                                  }))
                                }
                              />
                              <span>{level.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="trade-form-section">
                    <h3 className="trade-form-heading">
                      Preferred time and photos
                    </h3>
                    <div className="trade-form-grid">
                      <div className="trade-field">
                        <label htmlFor="trade-date">
                          Preferred date (optional)
                        </label>
                        <input
                          id="trade-date"
                          className="trade-input"
                          type="date"
                          value={enquiry.preferredDate}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              preferredDate: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field">
                        <label htmlFor="trade-time">
                          Preferred time (optional)
                        </label>
                        <input
                          id="trade-time"
                          className="trade-input"
                          type="time"
                          value={enquiry.preferredTime}
                          onChange={(event) =>
                            setEnquiry((value) => ({
                              ...value,
                              preferredTime: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="trade-field full">
                        <button
                          className="trade-photo-upload"
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={photos.length >= 5}
                        >
                          <Camera size={22} />
                          <strong>
                            {photos.length >= 5
                              ? "Maximum 5 photos added"
                              : "Add photos"}
                          </strong>
                          <span>Optional · up to 5 images</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={selectPhotos}
                        />
                        {photos.length > 0 && (
                          <div className="trade-photo-list">
                            {photos.map((photo, index) => (
                              <div
                                className="trade-photo"
                                key={photo.previewUrl}
                              >
                                <img
                                  src={photo.previewUrl}
                                  alt={`Job attachment ${index + 1}`}
                                />
                                <button
                                  type="button"
                                  aria-label={`Remove photo ${index + 1}`}
                                  onClick={() => removePhoto(index)}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="trade-form-section">
                    <label className="trade-confirm">
                      <input
                        type="checkbox"
                        checked={enquiry.confirmed}
                        onChange={(event) =>
                          setEnquiry((value) => ({
                            ...value,
                            confirmed: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        I understand this is a job request, not a confirmed
                        appointment. {businessName} will contact me to confirm
                        details, availability and price.
                      </span>
                    </label>
                    {enquiryStatus === "error" && (
                      <div className="trade-alert" role="alert">
                        {enquiryError}
                      </div>
                    )}
                    <button
                      className="trade-button trade-button-primary"
                      type="submit"
                      disabled={enquiryStatus === "sending"}
                      style={{ width: "100%", marginTop: 18 }}
                    >
                      {enquiryStatus === "sending"
                        ? "Sending request…"
                        : "Send job request"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="trade-footer">
        <div className="trade-shell">
          <div className="trade-footer-grid">
            <div className="trade-footer-main">
              <div
                className="trade-brand"
                style={{ color: "var(--footer-ink)" }}
              >
                <span className="trade-logo">
                  {logo ? (
                    <img src={logo} alt="" />
                  ) : (
                    businessName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="trade-brand-name">{businessName}</span>
              </div>
              <p style={{ maxWidth: 430, marginTop: 18 }}>
                {location || "Plumbing, heating and electrical services."}
              </p>
              {phone && <a href={`tel:${phone}`}>{phone}</a>}
              {email && <a href={`mailto:${email}`}>{email}</a>}
            </div>
            <div>
              <span className="trade-footer-label">Explore</span>
              {navLinks.map(([id, label]) => (
                <a href={`#${id}`} key={id}>
                  {label}
                </a>
              ))}
            </div>
            <div>
              <span className="trade-footer-label">Information</span>
              <button type="button" onClick={() => setLegalModal("privacy")}>
                Privacy policy
              </button>
              <button type="button" onClick={() => setLegalModal("terms")}>
                Terms & conditions
              </button>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              )}
            </div>
          </div>
          <div className="trade-footer-bottom">
            <span
              style={{
                color: "color-mix(in srgb, var(--footer-ink) 42%, transparent)",
                fontSize: ".7rem",
              }}
            >
              © {new Date().getFullYear()} {businessName}
            </span>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{ margin: 0 }}
            >
              Professional login
            </button>
          </div>
        </div>
      </footer>

      {legalModal && (
        <div
          className="trade-modal"
          role="presentation"
          onClick={() => setLegalModal(null)}
        >
          <div
            className="trade-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-legal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                alignItems: "center",
              }}
            >
              <h2 id="trade-legal-title" style={{ margin: 0 }}>
                {legalModal === "privacy"
                  ? "Privacy policy"
                  : "Terms & conditions"}
              </h2>
              <button
                className="trade-icon-button"
                type="button"
                aria-label="Close"
                onClick={() => setLegalModal(null)}
              >
                <X />
              </button>
            </div>
            <p
              className="trade-copy"
              style={{ whiteSpace: "pre-line", marginTop: 22 }}
            >
              {legalModal === "privacy" ? privacyText : termsText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
