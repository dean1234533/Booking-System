import { PLANS } from '../config/plans.js';

const paid = `Paid plans start from £${PLANS.basic.priceGBP}/month. Full is £${PLANS.full.priceGBP}/month. Paid plans include a ${PLANS.full.trialDays}-day free trial without card details.`;
const cta = { text: 'Start free — no card needed', href: '/signup' };

export const FEATURE_PAGES = {
  '/features/booking-deposits': {
    title: 'Booking Software with Deposits UK | Bookrightly',
    metaDescription: 'Take appointment deposits through Stripe with Bookrightly. Booking pages for UK service businesses, no Bookrightly commission. Paid plans from £5/month.',
    h1: 'Online booking software with appointment deposits',
    intro: 'Ask clients to commit when they book. Connect Stripe, set your deposit and let customers reserve an available appointment through your booking page.',
    features: [
      { h2: 'A deposit in the booking flow', p: 'Set up your services and availability, then configure deposit collection. Customers see the service and required payment as part of booking. A deposit gives the appointment a financial commitment; it does not guarantee that every client will attend.' },
      { h2: 'Stripe payments, with clear costs', p: 'Payments are processed through your connected Stripe account. Bookrightly does not add booking commission or mark up Stripe’s processing fee. Stripe’s own card-processing charges still apply; check your Stripe account for the rates relevant to your payment method.' },
      { h2: 'Explain your policy before the appointment', p: 'Make the deposit amount and cancellation expectations clear to clients before they book. Choose an approach that suits your services and discuss changes with customers when necessary. Deposit collection and communication work together to support a more reliable diary.' },
      { h2: 'Choose a plan with deposits', p: `Deposits are available on Basic, Widget and Full plans. The Free plan does not include deposit collection. ${paid}` },
    ],
    faq: [
      { q: 'Can I take a deposit when a client books?', a: 'Yes. Bookrightly supports appointment deposits through a connected Stripe account on Basic, Widget and Full plans.' },
      { q: 'Does Bookrightly take a percentage of the deposit?', a: 'No. Bookrightly adds no booking commission. Stripe’s own payment-processing fee applies to the transaction.' },
      { q: 'Are deposits included in the Free plan?', a: 'No. Choose Basic, Widget or Full for deposit collection. Paid plans start from £5/month after a 90-day free trial.' },
      { q: 'Will deposits eliminate no-shows?', a: 'No system guarantees attendance. Deposits add commitment and can support a clear cancellation policy, alongside appointment reminders and good communication.' },
    ], cta,
  },
  '/features/appointment-reminders': {
    title: 'Appointment Reminder Software UK | Bookrightly',
    metaDescription: 'Appointment confirmations and reminder emails for UK barbers, salons and service businesses. Keep clients informed with Bookrightly paid plans from £5/month.',
    h1: 'Appointment reminders for UK service businesses',
    intro: 'Give clients a useful reminder before their appointment, with the booking details close at hand. Spend less of your day manually chasing confirmations.',
    features: [
      { h2: 'Confirm the booking', p: 'A confirmation helps a client check what they booked and when they are due. Use accurate service details and working contact information so the message supports the appointment rather than creating another conversation to resolve.' },
      { h2: 'Remind clients before their visit', p: 'Bookrightly’s reminder workflow sends customers appointment information before the booking. Reminder email availability depends on the plan and the account’s setup. Accurate client details matter, and delivery can still depend on a recipient’s email service.' },
      { h2: 'Keep messages attached to real appointments', p: 'Booking details, updates and reminder handling belong together. When the appointment changes, make sure the client understands the new arrangements. A reminder is useful context; it is not a promise that a client has read the message or will attend.' },
      { h2: 'Email reminders on paid plans', p: `Basic, Widget and Full include customer confirmation and reminder email features. The Free plan does not include these email features. ${paid}` },
    ],
    faq: [
      { q: 'Does Bookrightly send appointment reminders?', a: 'Yes. Customer reminder email features are included on Basic, Widget and Full plans. Configure your booking setup and keep client contact details accurate.' },
      { q: 'Are reminder emails available on the Free plan?', a: 'No. The Free plan does not include customer confirmation or reminder email features. Paid plans start from £5/month.' },
      { q: 'Can reminders help with missed appointments?', a: 'Reminders give clients another chance to check the appointment details. They can support attendance alongside deposits and a clear cancellation policy, but they do not guarantee it.' },
      { q: 'Do customers need to install an app to book?', a: 'No. Customers can use the business’s public booking page in a web browser.' },
    ], cta,
  },
  '/features/booking-widget': {
    title: 'Website Booking Widget UK | Bookrightly from £5/month',
    metaDescription: 'Add online booking to your existing website with Bookrightly’s embeddable widget. Booking and live queue tools, Stripe deposits and no booking commission.',
    h1: 'Add a booking widget to your existing website',
    intro: 'Keep your website and add Bookrightly’s booking tools to it. The Widget plan is designed for businesses that already have somewhere customers visit online.',
    features: [
      { h2: 'An embedded customer booking flow', p: 'Bookrightly provides an embeddable widget connected to your business profile and booking setup. Customers can view services and available appointments from your own site. You manage the associated bookings through Bookrightly rather than maintaining a separate diary for the website.' },
      { h2: 'Use your existing site', p: 'Add the widget embed to a page that permits custom scripts. Installation depends on your website platform, theme and any security restrictions; check that your editor allows the embed before choosing the plan. Test the finished page on phones and desktop screens.' },
      { h2: 'Bookings, deposits and a live queue', p: 'The Widget plan includes booking, Stripe deposit collection, customer email features and live queue tools. Choose the flow that suits your business. The queue is particularly useful for barbers handling walk-ins alongside appointments.' },
      { h2: 'A plan for an existing website', p: `Widget is £${PLANS.widget.priceGBP}/month after a ${PLANS.widget.trialDays}-day free trial. It does not include a hosted branded website. Choose Full if you want Bookrightly to provide the website as well. Stripe’s own processing fees apply to payments.` },
    ],
    faq: [
      { q: 'How much is the Bookrightly booking widget?', a: 'The Widget plan is £5/month after a 90-day free trial without card details. Bookrightly adds no booking commission.' },
      { q: 'Does the Widget plan include a hosted website?', a: 'No. It is for embedding Bookrightly on a website you already have. Full provides a branded hosted website; Basic and Free offer lighter hosted booking pages.' },
      { q: 'Can I use the widget on any website?', a: 'The website must allow the widget’s custom script embed. Check the platform and editor restrictions, then test the embed before launch.' },
      { q: 'Does the Widget plan support deposits and a queue?', a: 'Yes. Widget includes deposit collection through Stripe and live queue features, together with customer confirmation and reminder email features.' },
    ], cta,
  },
  '/features/walk-in-queue': {
    title: 'Barber Walk-In Queue Software UK | Bookrightly',
    metaDescription: 'Manage a live barber walk-in queue alongside appointments with Bookrightly. Queue tools on Widget and Full plans, with no booking commission.',
    h1: 'Live walk-in queue software for UK barbers',
    intro: 'Give walk-in customers a clearer way to join the queue while you manage the day. Use Bookrightly’s queue tools alongside your appointment workflow.',
    features: [
      { h2: 'A queue customers can join from their phone', p: 'A live queue gives customers a way to join without relying on a paper list. It helps your shop keep track of who is waiting while you continue working. Explain how your queue operates so clients know what to expect when they arrive.' },
      { h2: 'Keep appointments and walk-ins in view', p: 'Appointments and walk-ins create different demands on a barber’s working day. Bookrightly brings queue tools and booking information into the same business setup, helping you manage the flow without sending customers to a separate system.' },
      { h2: 'Set realistic expectations', p: 'Service durations, late arrivals and changes during the day can affect waiting time. Treat queue information as a guide and communicate when the plan changes. The queue helps organise waiting customers; it does not guarantee a fixed waiting time.' },
      { h2: 'Choose Widget or Full for queue tools', p: `Live queue features are included on Widget (£${PLANS.widget.priceGBP}/month) and Full (£${PLANS.full.priceGBP}/month). Basic and Free do not include the queue. Both paid options start with a ${PLANS.full.trialDays}-day free trial.` },
    ],
    faq: [
      { q: 'Does Bookrightly support barber walk-ins?', a: 'Yes. Widget and Full include live queue features that can be used alongside booked appointments.' },
      { q: 'Is the live queue available on the Free plan?', a: 'No. Live queue features are available on Widget and Full, not on Basic or Free.' },
      { q: 'Can I show queue tools on my existing website?', a: 'Yes. Widget is designed for an existing website and includes queue features. The website must support the custom script embed.' },
      { q: 'Does the queue guarantee an exact waiting time?', a: 'No. Actual waiting times depend on services, arrivals and how the shop runs the day. Communicate any changes to waiting customers.' },
    ], cta,
  },
  '/features/branded-booking-page': {
    title: 'Your Own Branded Booking Page UK | Bookrightly',
    metaDescription: 'Create a branded online booking page for your UK service business. Share services, prices and availability with customers. Free and paid Bookrightly plans.',
    h1: 'Your own online booking page, built around your business',
    intro: 'Give customers a clear place to view your services and book. Share your Bookrightly link from your social profiles, messages or Google Business Profile.',
    features: [
      { h2: 'A direct link to your business', p: 'Your public booking link gives customers somewhere to check services, prices and available times. Keep that information current so the page answers the questions people have before contacting you. A direct link is especially useful when customers already know your name.' },
      { h2: 'Choose the level of branding you need', p: 'Free provides a simple booking page. Basic adds a more capable hosted page and paid booking features. Full provides the complete branded website, with portfolio, reviews and custom sections. Choose the plan according to the content and tools you need.' },
      { h2: 'Make the next step clear', p: 'Use service names and descriptions that customers recognise. Show relevant prices and appointment durations, then share the page where your customers already find you. A booking page helps convert interest into an appointment; it does not guarantee new customer discovery or search rankings.' },
      { h2: 'Start with a free page or a paid plan', p: `Free has no time limit. Basic is £${PLANS.basic.priceGBP}/month and Full is £${PLANS.full.priceGBP}/month after a ${PLANS.full.trialDays}-day trial. Widget is a separate option for a website you already have. Feature availability differs by plan.` },
    ],
    faq: [
      { q: 'Do I need a website before using Bookrightly?', a: 'No. Free, Basic and Full provide hosted pages. Widget is for adding booking tools to an existing website.' },
      { q: 'Where can I share my booking link?', a: 'You can share it in social profiles, customer messages, printed materials or your Google Business Profile so customers can find your page directly.' },
      { q: 'Which plan includes portfolio and reviews?', a: 'Full includes portfolio, reviews and custom sections on your branded website. Check the pricing page for the features in the lighter plans.' },
      { q: 'Do clients need to download an app?', a: 'No. Clients can open your booking page in their browser. Installing an app is not required to book.' },
    ], cta,
  },
};

export const COMPARISON_PAGES = {
  '/compare': {
    title: 'Compare Booking Software UK | Bookrightly & Alternatives',
    metaDescription: 'Compare Bookrightly with Fresha, Treatwell and Booksy: direct booking pages, marketplace discovery, plan features and payment costs for UK service businesses.',
    h1: 'Compare online booking software for your UK business',
    intro: 'Start with the way your business works: how clients find you, what they book and which tools you need. Compare the complete cost and available features before choosing a platform.',
    features: [
      { h2: 'Direct links and marketplace discovery', p: 'Bookrightly focuses on your direct booking page and website tools. Fresha, Treatwell and Booksy also provide marketplace discovery channels. If an existing marketplace brings you customers, include the value of that channel in your decision.' },
      { h2: 'Different fee models', p: 'Bookrightly adds no booking commission. Fresha describes a one-time fee for new clients discovered through its marketplace, while Treatwell says repeat bookings are commission-free. Check current subscriptions, payment charges, optional features and account-specific terms rather than applying one percentage to every booking.' },
      { h2: 'Choose your required workflow', p: 'Check services, appointment durations, deposits, reminders, branding and staff requirements. For barbers, consider walk-ins as well as appointments. For PTs or trades, check the specific client or enquiry flow. A feature available on one plan may not be included on another.' },
      { h2: 'Bookrightly plans at a glance', p: `${paid} Free has no time limit and offers a simpler booking page. Basic adds deposits and customer emails; Widget and Full also include live queue tools. Full provides the complete branded website. Stripe processing fees are separate.` },
    ],
    faq: [
      { q: 'Which booking software is best for my business?', a: 'Choose according to your booking workflow, staff requirements, customer discovery channels and budget. Test the required features and compare each provider’s current terms.' },
      { q: 'Does Bookrightly add booking commission?', a: 'No. Bookrightly adds no booking commission. Its paid plans have a flat monthly price, with Stripe payment-processing fees charged separately.' },
      { q: 'Are all Bookrightly features included in Free?', a: 'No. Free is a simpler booking page without deposits, customer reminder emails or live queue features. Paid plans have different feature sets; review the pricing page before choosing.' },
      { q: 'Where can I check competitor fees?', a: 'Use each provider’s current pricing or partner information and your account agreement. Marketplace acquisition fees, subscription costs and card-processing charges are different types of cost.' },
    ], sources: [{ label: 'Fresha pricing', url: 'https://www.fresha.com/pricing' }, { label: 'Treatwell partner information', url: 'https://www.treatwell.co.uk/partners/' }, { label: 'Booksy UK barber software', url: 'https://biz.booksy.com/en-gb/who-loves-us/barber' }], cta,
  },
  '/fresha-alternative': {
    title: 'Fresha Alternative UK | No Booking Commission | Bookrightly',
    metaDescription: 'Compare Bookrightly with Fresha for your UK service business. Free plan, paid plans from £5/month and direct branded booking pages without Bookrightly commission.',
    h1: 'A Fresha alternative for direct online bookings',
    intro: 'Compare the way you want customers to find and book your business. Bookrightly provides direct booking tools and flat plan prices; Fresha combines salon software with marketplace discovery.',
    features: [
      { h2: 'Understand marketplace acquisition fees', p: 'Fresha says its marketplace new-client fee applies once to a new client discovered through the marketplace. Returning clients do not attract that marketplace fee. Read its current pricing and fee conditions rather than assuming a percentage applies to every booking.' },
      { h2: 'Bookrightly’s direct-booking model', p: 'Bookrightly adds no booking commission. Share your own booking link with customers or add a widget to an existing website. You still need to bring people to the page through your existing customers, social profiles, website and other marketing.' },
      { h2: 'Compare the features you actually use', p: 'Check your service menu, branding, deposits, reminders and queue needs against the plan. If you need a large staff setup, inventory, a marketplace audience or other salon operations tools, compare those requirements in both products before switching.' },
      { h2: 'A plan you can try before choosing', p: `${paid} Free remains available without a time limit. Stripe’s own processing charges apply to paid transactions. The cost of your plan and card processing are different things.` },
    ],
    faq: [
      { q: 'Does Fresha charge commission on every booking?', a: 'Fresha describes a one-time marketplace new-client fee for clients discovered through its marketplace. Returning clients do not attract that fee. Other subscription, payment and optional-service costs should be checked on its current pricing page.' },
      { q: 'Does Bookrightly take booking commission?', a: 'No. Bookrightly adds no booking commission. Paid plans have a flat monthly price and Stripe’s own processing fee applies to card payments.' },
      { q: 'Will Bookrightly bring the same marketplace audience?', a: 'Bookrightly focuses on your direct booking page and website tools. Do not assume it will replace the customer discovery provided by another platform’s marketplace.' },
      { q: 'Can I try Bookrightly before switching?', a: 'Yes. There is a Free plan without a time limit, or a 90-day trial of a paid plan without card details. Test the workflow you need before changing your customer links.' },
    ], sources: [{ label: 'Fresha pricing', url: 'https://www.fresha.com/pricing' }, { label: 'Fresha marketplace fee explanation', url: 'https://www.fresha.com/help-center/knowledge-base/billing-and-fees/188-marketplace-new-client-fees' }], cta,
  },
  '/treatwell-alternative': {
    title: 'Treatwell Alternative UK | Direct Booking Pages | Bookrightly',
    metaDescription: 'Compare Bookrightly and Treatwell for UK salons. Direct booking pages, flat paid plans from £5/month and no Bookrightly booking commission. Start free.',
    h1: 'A Treatwell alternative for your direct booking page',
    intro: 'Choose between the tools and customer channels your business needs. Bookrightly offers a direct page and booking workflow; Treatwell also provides salon software and marketplace discovery.',
    features: [
      { h2: 'Separate new clients from repeat bookings', p: 'Treatwell says commission applies to a client’s first appointment and repeat bookings are commission-free. Its website and social booking routes are also described as commission-free. Check your partner agreement for the charges that apply to your account.' },
      { h2: 'Flat plans for Bookrightly bookings', p: 'Bookrightly does not add a commission to a booking. The plan price stays separate from Stripe’s payment-processing charge. Free, Basic, Widget and Full provide different levels of website and booking functionality, so compare what you need rather than only a headline fee.' },
      { h2: 'Consider how customers will find you', p: 'A marketplace can help people discover a salon. A direct booking page is useful when customers reach you through your own name, reviews, website or social channels. Bookrightly’s direct page is not a promise to replace the discovery traffic you currently receive elsewhere.' },
      { h2: 'Test the workflow before changing links', p: `${paid} Check your services, availability, deposit setup and customer journey during the trial. Plan how existing bookings and client records will be handled before making a change; do not assume an automatic migration is included.` },
    ],
    faq: [
      { q: 'Does Treatwell charge commission on repeat bookings?', a: 'Treatwell says repeat bookings are commission-free, and commission applies to a client’s first appointment. Review its current terms and your partner agreement for account-specific charges.' },
      { q: 'How is Bookrightly priced?', a: 'Free has no time limit. Basic and Widget are £5/month and Full is £10/month after a 90-day free trial. Stripe payment-processing charges are separate.' },
      { q: 'Can I keep my own website?', a: 'Yes. The Bookrightly Widget plan adds booking and queue tools to an existing website that supports the embed. Hosted page plans are also available.' },
      { q: 'Will Bookrightly automatically migrate my Treatwell data?', a: 'Do not assume an automatic migration. Check the records and existing appointments you need to retain and discuss your setup before switching.' },
    ], sources: [{ label: 'Treatwell partner information', url: 'https://www.treatwell.co.uk/partners/' }, { label: 'Treatwell partner terms', url: 'https://www.treatwell.co.uk/info/supplier-terms-and-conditions/' }], cta,
  },
  '/booksy-alternative': {
    title: 'Booksy Alternative UK | Barber & Salon Booking | Bookrightly',
    metaDescription: 'A Booksy alternative for UK barbers and salons. Compare direct booking pages, deposits, live queues and flat Bookrightly plans. Free plan or 90-day paid trial.',
    h1: 'A Booksy alternative for UK barbers and salons',
    intro: 'If you want a direct booking page with predictable plan costs, explore Bookrightly. Compare your day-to-day requirements with Booksy’s booking, marketplace and business tools before choosing.',
    features: [
      { h2: 'Direct bookings and your own customer links', p: 'Bookrightly lets you share a direct booking link with customers who find you through your business, website or social profiles. Booksy also offers a marketplace channel for customer discovery. Decide how important that channel is to your shop before replacing it.' },
      { h2: 'Deposits and walk-ins', p: 'Choose Basic, Widget or Full for Stripe deposit collection. Widget and Full also include live queue tools for walk-ins; Basic and Free do not. These are separate features, so pick the plan that fits how your shop manages appointments and waiting customers.' },
      { h2: 'Check team and salon requirements', p: 'If your shop needs several staff calendars, retail stock, point-of-sale tools or other advanced salon operations, check the current capabilities in both products. Do not assume every team or marketplace feature is included in a lower-priced direct booking plan.' },
      { h2: 'Compare current costs and try the booking flow', p: `${paid} Bookrightly adds no booking commission, while Stripe’s processing fee still applies to card transactions. Read Booksy’s current UK pricing and optional-feature terms, then test Bookrightly with the services and workflow you need.` },
    ],
    faq: [
      { q: 'Is Bookrightly an alternative to Booksy for barbers?', a: 'Yes, if a direct booking page and Bookrightly’s available features suit your shop. Compare staff, payments, queue and customer discovery requirements before choosing.' },
      { q: 'Can I use a free Bookrightly plan?', a: 'Yes. Free has no time limit but does not include deposits, customer reminder emails or the live queue. Paid plans add these features according to the plan.' },
      { q: 'Does Bookrightly include a live walk-in queue?', a: 'Widget and Full include live queue features. Basic and Free do not.' },
      { q: 'Does Bookrightly replace Booksy’s marketplace discovery?', a: 'Do not assume the same discovery audience. Bookrightly focuses on direct links, hosted pages and website tools, so plan how customers will reach your page.' },
    ], sources: [{ label: 'Booksy UK barber software', url: 'https://biz.booksy.com/en-gb/who-loves-us/barber' }, { label: 'Booksy UK features', url: 'https://biz.booksy.com/en-gb/features' }], cta,
  },
};

export const FEATURE_LINKS = Object.entries(FEATURE_PAGES).map(([path, page]) => ({ path, label: page.h1 }));

// Public utility and information pages share metadata between the app and Worker.
export const PUBLIC_PAGE_META = {
  '/privacy': { title: 'Bookrightly Privacy Policy', desc: 'How Bookrightly handles information used by its UK booking platform.' },
  '/terms': { title: 'Bookrightly Terms of Service', desc: 'Terms for using Bookrightly’s booking platform and business tools.' },
  '/contact': { title: 'Contact Bookrightly | UK Booking Software', desc: 'Contact Bookrightly for help with booking pages, plans and business setup.' },
  '/tools': { title: 'Free Booking & Business Calculators UK | Bookrightly', desc: 'Free calculators for missed appointments, revenue, PT rates and service pricing from Bookrightly.' },
  '/tools/revenue-calculator': { title: 'Free Revenue Calculator | Bookrightly', desc: 'Explore revenue scenarios for your service business with Bookrightly’s free calculator.' },
  '/tools/pt-rate-calculator': { title: 'Personal Trainer Rate Calculator UK | Bookrightly', desc: 'Plan a personal training session rate with Bookrightly’s free PT rate calculator.' },
  '/tools/service-pricing-calculator': { title: 'Service Pricing Calculator UK | Bookrightly', desc: 'Explore service pricing with a free calculator for UK service professionals.' },
};
