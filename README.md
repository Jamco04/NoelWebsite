# noelconnolly.ie

The website of Cllr Noel Connolly, Kildare County Council. It's a plain static site (HTML, CSS and JavaScript, with no build step) hosted on GitHub Pages.

| Page | File |
| --- | --- |
| Home | `index.html` |
| Recent Activities (placeholder content) | `activities.html` |
| Social (placeholder links) | `social.html` |
| Contact, with the topic picker and form | `contact.html`, `assets/js/contact.js` |
| Privacy notice (draft) | `privacy.html` |

The contact form posts to the address in `assets/js/config.js`. That is either the Constituency CRM's website-form endpoint (recommended: one copy of each query, stored in Ireland) or the Google Apps Script web app in `apps-script/Code.gs`, which emails the office a formatted message, sends the sender a confirmation in English and Irish, and keeps a 30-day log in a Google Sheet. Until the address is set, the form runs in preview mode and sends nothing.

The site sets no cookies and makes no third-party requests (fonts are self-hosted), so it needs no cookie banner. Retention periods are in `privacy.html` and must match the CRM's.

- **Going live** (form, GitHub Pages, photos, domain): [SETUP.md](SETUP.md)
- **Connecting the Constituency CRM:** [CRM-HANDOFF-PROMPT.md](CRM-HANDOFF-PROMPT.md)

To try it locally, run `python3 -m http.server` in this folder and open <http://localhost:8000>.
