# noelconnolly.ie

The website of Cllr Noel Connolly, Kildare County Council. It's a plain static site (HTML, CSS and JavaScript, with no build step) hosted on GitHub Pages.

| Page | File |
| --- | --- |
| Home | `index.html` |
| Recent Activities (placeholder content) | `activities.html` |
| Social (placeholder links) | `social.html` |
| Contact, with the topic picker and form | `contact.html`, `assets/js/contact.js` |
| Privacy notice (draft) | `privacy.html` |

The contact form posts to the address in `assets/js/config.js`. That is the Constituency CRM's website-form endpoint, which stores each query as a case in the EU and sends the confirmation. The Google Apps Script in `apps-script/Code.gs` is kept as a fallback: it emails the office a formatted message, sends the sender a confirmation in English and Irish, and keeps a 30-day log in a Google Sheet. If the address isn't an `https://` URL, the form runs in preview mode and sends nothing.

The site sets no cookies and makes no third-party requests (fonts are self-hosted), so it needs no cookie banner. Retention periods are in `privacy.html` and must match the CRM's.

- **Going live** (form, GitHub Pages, photos, domain): [SETUP.md](SETUP.md)

To try it locally, run `python3 -m http.server` in this folder and open <http://localhost:8000>.
