# anmolmultani.ca

Personal website for **Anmol Multani**, Mortgage Broker (Clearstone Financial / Vine Mortgage Group), serving PEI, Nova Scotia, and New Brunswick.

Live at **https://anmolmultani.ca**, hosted free on GitHub Pages.

This is a plain static site — HTML, CSS, and vanilla JavaScript. No build step, no framework, no `npm install`. Open any `.html` file in a browser and it works; edit a file and refresh to see the change. That was a deliberate choice so the site stays editable by anyone, forever, without needing to learn a toolchain.

---

## Quick start for future edits

**If you just want to change text, numbers, rates, or links** — you almost never need to touch HTML. Open **`settings.js`**. It's one file, split into 11 numbered, commented sections, and it's loaded on every page:

| # | What it controls | Variable |
|---|---|---|
| 1 | Posted mortgage rates (Rates section, homepage) | `RATES` |
| 2 | Client testimonials (Reviews section, homepage) | `REVIEWS` |
| 3 | Phone / email shown across the site | `CONTACT` |
| 4 | Where contact-form submissions get emailed (Web3Forms) | `FORM_ACCESS_KEY` |
| 5 | "Start your application" button target (Vine portal) | `APPLICATION_LINK` |
| 6 | "Book a call" button target (Google Calendar) | `BOOKING_LINK` |
| 7 | "Our story" paragraph(s), About section | `ABOUT_TEXT` |
| 8 | Team bios, photos, titles | `TEAM` |
| 9 | Lender logo marquee (who you work with) | `LENDERS` |
| 10 | Footer social icons (Instagram/TikTok/YouTube) | `SOCIAL` |
| 11 | Featured video on the Blog page | `FEATURED_VIDEO` |

Edit a value, save, push — that's the whole workflow. Nothing in `settings.js` needs a rebuild.

**If you want to change layout, colours, or add a new page**, that's real HTML/CSS/JS — see [File structure](#file-structure) below.

---

## File structure

```
index.html                     Homepage — hero, services, lenders, stats, rates,
                                about, team, reviews, careers, contact
guides.html                    Guides overview page
guides/
  first-time-buyer.html        Guide + FAQ + email-gated PDF download
  newcomer-to-canada.html         "
  nurses-healthcare.html          "
  self-employed.html              "
  guide-*.pdf                   The downloadable PDFs served to visitors
calculators.html                Mortgage payment calculator
affordability-calculator.html   GDS/TDS pre-qualification estimator
land-transfer-tax-calculator.html  PEI/NS/NB land transfer tax estimator
closing-cost-calculator.html    Closing cost estimator
blog.html                       Blog placeholder + featured video + Instagram feed
feedback.html                   Feedback form (bugs, ideas, testimonials)

settings.js                     ALL editable business data — see table above
site.js                         Shared behaviour: nav, animations, rendering
                                 settings.js data onto every page, theme toggle,
                                 smooth scroll (Lenis + GSAP)
styles.css                      All shared design — one file, every page

lender-logos/                   Lender logo image files + README.txt
                                 with exact expected filenames
instagram-posts.json            Auto-generated — do not hand-edit (see below)
.github/workflows/
  refresh-instagram.yml         Weekly job that refreshes instagram-posts.json

CNAME                           Custom domain config for GitHub Pages
robots.txt / sitemap.xml        SEO
```

Every page repeats the same `<header>`/nav/footer markup (there's no templating engine), so a nav-wide change — like adding a new page to the menu — needs to be repeated across all ~12 HTML files. Tedious but simple; there's nothing hidden to break.

---

## Features built so far

- **Multi-page site**: homepage, 4 guide pages (each with FAQ + email-gated PDF download), a guides overview, 4 calculators, blog, feedback form
- **Editable business data**: one file (`settings.js`) drives rates, reviews, team, lenders, contact links, socials — no code edits needed for routine updates
- **Lender logo marquee**: scrolling strip of partner logos on the homepage, each in a uniform white card; logos with light/white artwork (Strive, RMG) automatically get a dark card instead so they stay visible — controlled by a `dark: true` flag per entry in `LENDERS`
- **Calculators**: mortgage payment, GDS/TDS affordability/pre-qualification (with the federal stress test), land transfer tax (PEI/NS/NB, each with correct province-specific rules), closing costs
- **Booking**: "Book a call" button links straight to a real Google Calendar appointment page (a true embedded iframe isn't possible — Google blocks that with `X-Frame-Options`)
- **Contact form**: emails Anmol directly via Web3Forms if `FORM_ACCESS_KEY` is set in `settings.js`; otherwise falls back to opening the visitor's email app
- **SEO**: meta tags, Open Graph/Twitter cards, JSON-LD structured data (schema.org `FinancialService`), `sitemap.xml`, `robots.txt`
- **Social links**: Instagram, TikTok, YouTube icons in the footer (rendered only if a URL is set in `SOCIAL`)
- **Automated Instagram feed**: a GitHub Actions workflow pulls Anmol's latest 4 Instagram posts once a week and writes them to `instagram-posts.json`, which the Blog page reads and displays — fully hands-off once set up (details below)
- **Day/night mode toggle**: sun/moon button in the nav on every page. Follows the visitor's system setting by default; clicking it sets an explicit override saved in the browser's `localStorage`, so their choice persists across visits
- **Smooth scroll + animations**: GSAP + ScrollTrigger + Lenis (all via CDN), with `prefers-reduced-motion` respected

## Deactivated features

Insurance and Investment services are commented out (not deleted) in `index.html` — search for `DEACTIVATED` to find all four spots (nav dropdown, hero subtext, services grid, contact form dropdown). Re-enabling them later is just uncommenting those blocks.

## Not yet configured

- **`FORM_ACCESS_KEY`** in `settings.js` is empty — get a free key at web3forms.com and paste it in to have the contact form email Anmol directly instead of opening the visitor's email client.
- **Real lender logo files** — most have been added to `lender-logos/`; if a new lender is added to the `LENDERS` list without a matching image, it just falls back to showing the name as plain text (no error).
- **`FEATURED_VIDEO`** in `settings.js` is empty — paste a YouTube link in to feature it on the Blog page.

---

## The Instagram feed, in detail

`instagram-posts.json` is machine-generated — **never hand-edit it**, it gets overwritten every run.

- `.github/workflows/refresh-instagram.yml` runs every Monday (and can be triggered manually from the repo's **Actions** tab → "Refresh Instagram feed" → **Run workflow**).
- It calls the Instagram Graph API using a repo secret named `IG_ACCESS_TOKEN`, strips out everything except the 4 most recent posts (deliberately — the raw API response's pagination field embeds the access token in plain text, which must never be committed), and pushes the result back to the repo.
- **The token expires roughly every 60 days.** If a second secret, `GH_PAT_FOR_SECRETS` (a GitHub personal access token with `repo` scope), is also set, the workflow refreshes and re-saves the token automatically every run. Without it, the feed will silently stop updating once the token expires — check back periodically, or set up that second secret to make it fully hands-off.
- If a token ever needs replacing: Meta's developer console doesn't reliably revoke old tokens through its own UI for this login type — the only way that has actually worked is **deleting and recreating the Meta app entirely**, which invalidates every token issued under it. Then generate a fresh token and update the `IG_ACCESS_TOKEN` secret.

---

## Deployment

- Hosted on **GitHub Pages**, custom domain **anmolmultani.ca** (bought via Wix, DNS points at GitHub Pages).
- Every push to `main` triggers an automatic rebuild — usually live within 1–2 minutes, though GitHub's CDN caches pages for up to 10 minutes, so a hard refresh may be needed to see the very latest version immediately after a push.
- HTTPS is enforced automatically (Let's Encrypt certificate, auto-renewing).
- To deploy changes: commit, push to `main`. There is no separate build/deploy command.

## Editing locally

No dependencies to install. Two ways to preview changes before pushing:

1. **Just open the HTML file directly in a browser** — works for most changes.
2. **Run a local server** (needed for anything that does a `fetch()`, like the Instagram feed section, since browsers block `fetch` on `file://` pages):
   ```
   cd "website new"
   python3 -m http.server 8000
   ```
   then visit `http://127.0.0.1:8000/index.html`.

---

## A few things worth knowing before editing

- **The nav is duplicated on every page.** There's no shared header/footer include — if you add a nav link, menu item, or footer column, it needs to be added to all ~12 HTML files individually.
- **Colours/theme**: CSS custom properties in `styles.css` (top of the file) define light and dark palettes. The day/night toggle sets `data-theme="light"` or `data-theme="dark"` on the `<html>` element to override the system default — see the `THEME TOKENS` and `THEME TOGGLE` comment blocks in `styles.css`.
- **Below 520px width**, the header's "Get in touch" pill is hidden to stop it crowding out the hamburger menu button — the mobile menu already has its own Contact link, so nothing is lost.
- **`lender-logos/`** — some lender-supplied logo files are white/light-coloured and need a dark background to stay visible (see the `dark: true` flag in `settings.js`). Check any new logo against both a light and dark card before assuming it "just works."
