/**
 * useDomainRouter.js
 *
 * Custom hook that detects whether the visitor is on a custom barber domain
 * (e.g. deansbarbershop.com) vs. your main SaaS platform domain
 * (e.g. yoursaas.com/barber/deansbarbershop).
 *
 * HOW IT WORKS:
 *  - Cloudflare SSL for SaaS routes ALL custom hostnames to your Cloudflare Pages
 *    app (the fallback origin). Your app receives the original Host header.
 *  - window.location.hostname tells you which domain the visitor is actually on.
 *  - If it's not your platform domain, query Firestore for the barber whose
 *    customDomain matches — then load their profile.
 *
 * USAGE in your barber public page (e.g. BarberPage.jsx):
 *
 *   const { barberId, loading, error } = useDomainRouter();
 *   // then fetch profile using barberId as normal
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase/config";

// Your platform's own domains — requests from these are NOT custom-domain visits
const PLATFORM_DOMAINS = [
  "yoursaas.com",
  "www.yoursaas.com",
  "your-app.pages.dev",      // Cloudflare Pages preview URL
  "localhost",
  "127.0.0.1",
];

export function useDomainRouter() {
  const [barberId, setBarberId] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    async function resolve() {
      const hostname = window.location.hostname;

      // Not a custom domain — let the normal router handle it
      if (PLATFORM_DOMAINS.includes(hostname)) {
        setLoading(false);
        return;
      }

      // It's a custom domain — find the barber
      try {
        const snap = await getDocs(
          query(
            collection(db, "barbers"),
            where("customDomain", "==", hostname),
            limit(1)
          )
        );

        if (snap.empty) {
          setError(`No barber found for domain: ${hostname}`);
        } else {
          setBarberId(snap.docs[0].id);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    resolve();
  }, []);

  return { barberId, loading, error };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO WIRE THIS INTO YOUR ROUTER (React Router v6 example)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * // App.jsx
 * import { BrowserRouter, Routes, Route } from "react-router-dom";
 * import BarberPublicPage from "./pages/BarberPublicPage";
 * import DomainGateway    from "./pages/DomainGateway";
 *
 * export default function App() {
 *   return (
 *     <BrowserRouter>
 *       <Routes>
 *         // Standard routes (yoursaas.com/barber/:id)
 *         <Route path="/barber/:barberId" element={<BarberPublicPage />} />
 *
 *         // Custom domain catch-all — DomainGateway uses useDomainRouter()
 *         // to figure out WHICH barber to render
 *         <Route path="/*" element={<DomainGateway />} />
 *       </Routes>
 *     </BrowserRouter>
 *   );
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DomainGateway.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * import { useDomainRouter } from "../hooks/useDomainRouter";
 * import BarberPublicPage    from "./BarberPublicPage";
 *
 * export default function DomainGateway() {
 *   const { barberId, loading, error } = useDomainRouter();
 *
 *   if (loading) return <FullPageSpinner />;
 *   if (error)   return <NotFoundPage message={error} />;
 *   if (!barberId) return <NotFoundPage />;
 *
 *   // Render the barber's public page as if we'd navigated to /barber/:id
 *   return <BarberPublicPage barberId={barberId} />;
 * }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS WORKS ON CLOUDFLARE PAGES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * When a visitor goes to deansbarbershop.com:
 *
 *  1. Cloudflare resolves the Custom Hostname record you created.
 *  2. It proxies the request to your Pages fallback origin (your-app.pages.dev)
 *     while preserving the original Host header.
 *  3. Cloudflare Pages serves your SPA's index.html (via the _redirects rule below).
 *  4. React boots up, useDomainRouter() reads window.location.hostname →
 *     "deansbarbershop.com", queries Firestore, and renders the right barber.
 *
 * Add this to your /public/_redirects file so all paths serve index.html:
 *
 *   /*  /index.html  200
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIRESTORE SECURITY RULES — add an index for the query above
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * In Firebase Console → Firestore → Indexes → Composite → Add index:
 *   Collection:  barbers
 *   Field:       customDomain  (Ascending)
 *   Query scope: Collection
 *
 * In firestore.rules, allow public reads on the customDomain field:
 *
 *   match /barbers/{barberId} {
 *     allow read: if true;  // public profiles are readable
 *     allow write: if request.auth.uid == barberId;
 *   }
 */