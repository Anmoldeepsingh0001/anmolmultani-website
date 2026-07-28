/* ============================================================
   BROKER SETTINGS — edit, save, refresh. That's the whole job.
   This file is shared by every page on the site.
   ============================================================ */

// 1) YOUR RATES — edit any number here, save, refresh. That's it.
//    cat: 'fixed' or 'variable' (controls which tab shows the row)
var RATES = [
  { term: '3-Year Fixed',    cat: 'fixed',    pct: '4.29', note: 'Great if you expect rates to drop at renewal' },
  { term: '5-Year Fixed',    cat: 'fixed',    pct: '4.29', note: 'Most popular — payment locked in for five years'  },
  { term: '3-Year Variable', cat: 'variable', pct: '3.6', note: 'Moves with prime; break costs are usually lower'   },
  { term: '5-Year Variable', cat: 'variable', pct: '3.7', note: 'Long-term flexibility; benefits if prime falls'    }
];

// 2) YOUR REVIEWS — add or edit here. stars = 1 to 5. Save, refresh.
var REVIEWS = [
  { name: 'Sarah & Dan', detail: 'First-time buyers · Halifax',  stars: 5, quote: 'Anmol made our first purchase feel simple. He explained every step and found us a rate our bank couldn’t match.' },
  { name: 'Priya M.',    detail: 'Newcomer to Canada · Moncton', stars: 5, quote: 'As a newcomer I was nervous about qualifying. He knew exactly which lenders to approach and got us approved.' },
  { name: 'James R.',    detail: 'Refinance · Charlottetown',    stars: 5, quote: 'Consolidated our debt and lowered our monthly payment. Honest advice with zero pressure the whole way.' }
];

// 3) YOUR CONTACT DETAILS — used across the site and on the downloadable rate sheet.
var CONTACT = { phone: '(902) 919-9487', tel: '+19029199487', email: 'info@anmolmultani.ca', photo: 'anmol-headshot.jpg' };

// 4) CONTACT FORM DELIVERY — paste your free Web3Forms access key so form
//    submissions email you directly. Get one at web3forms.com (enter your
//    email, they email you a key). Leave '' and forms fall back to
//    opening the visitor's email app instead.
var FORM_ACCESS_KEY = '';

// 5) MORTGAGE APPLICATION LINK — paste your Vine application / portal URL here.
//    (Full applications should run through Vine's secure system, not this site.)
//    Leave '' and the button simply scrolls to the contact section.
var APPLICATION_LINK = 'https://r.mtg-app.com/anmol';

// 6) BOOKING LINK — paste your Google Calendar appointment scheduling page URL here.
//    To create one: Google Calendar → Create → Appointment schedule → set your
//    availability → click "Booking page" → copy that URL and paste it below.
//    Leave '' and the booking page shows your phone/email instead of a calendar.
var BOOKING_LINK = 'https://calendar.app.google/tehVhbYwSrSFsF5w7';

// 7) YOUR STORY — add or edit paragraphs here anytime, save, refresh.
//    Each entry becomes its own paragraph in the "Our story" section.
var ABOUT_TEXT = [
  'We’re not a bank — we work for you. Through Vine Group’s hub model we serve clients right across Canada, with access to a wide network of lenders, honest advice, and a team that treats your file like our own.'
];

// 8) YOUR TEAM — add, remove, or edit members here. photo is optional;
//    if left blank or the file is missing, the first letter of the name shows instead.
var TEAM = [
  { name: 'Anmol Multani', role: 'COO · Clearstone Financial', photo: 'anmol-headshot.jpg',
    bio: 'Small-town roots are what led me to PEI — that same close-knit feel, just somewhere new to call home. I hold a bachelor’s and postgraduate diploma in IT, and now spend my time helping clients right across Canada get into their homes through Vine Group’s hub model. Outside of work: the gym, travelling, or creating content.' },
  { name: 'Nicholas Gaudet', role: 'Mortgage Broker & Financial Advisor', photo: 'nicholas.jpg',
    bio: 'President & CEO of Clearstone Financial, guiding clients through every step of their mortgage. Off the clock, he’s a history major at heart who’s rarely without a good book.' }
];

// 9) LENDERS YOU WORK WITH — shown as a scrolling strip on the homepage.
//    Each one shows its logo automatically once you drop a matching PNG
//    into the lender-logos/ folder (see lender-logos/README.txt for exact
//    filenames) — until then, or if a file is missing, the name shows as
//    plain text instead. Add, remove, or rename entries here anytime.
var LENDERS = [
  { name: 'TD',              logo: 'lender-logos/td.png' },
  { name: 'Scotiabank',      logo: 'lender-logos/scotiabank.png' },
  { name: 'BMO',             logo: 'lender-logos/bmo.png' },
  { name: 'Strive',          logo: 'lender-logos/strive.png' },
  { name: 'Home Trust',      logo: 'lender-logos/home-trust.png' },
  { name: 'CMI',             logo: 'lender-logos/cmi.png' },
  { name: 'Keystone',        logo: 'lender-logos/keystone.png' },
  { name: 'First National',  logo: 'lender-logos/first-national.png' },
  { name: 'MCAP',            logo: 'lender-logos/mcap.png' },
  { name: 'RMG',             logo: 'lender-logos/rmg.png' },
  { name: 'Merix Financial', logo: 'lender-logos/merix.png' },
  { name: 'B2B Bank',        logo: 'lender-logos/b2b-bank.png' }
];
