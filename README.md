# noelconnolly.ie

The website of Cllr Noel Connolly, Kildare County Council. It's a plain static site (HTML, CSS and JavaScript, with no build step) hosted on GitHub Pages.

| Page | File |
| --- | --- |
| Home | `index.html` |
| Recent Activities (placeholder content) | `activities.html` |
| Social (placeholder links) | `social.html` |
| Contact, with the topic picker and form | `contact.html`, `assets/js/contact.js` |
| Privacy notice (draft) | `privacy.html` |

The contact form sends to a Google Apps Script web app (`apps-script/Code.gs`). The script emails the office a formatted message, sends the sender a confirmation in English and Irish, and logs each message to a Google Sheet. The web app's address goes in `assets/js/config.js`. Until it's set, the form runs in preview mode and sends nothing.

- **Going live** (form, GitHub Pages, photos, domain): [SETUP.md](SETUP.md)
- **Connecting the Constituency CRM:** [CRM-HANDOFF-PROMPT.md](CRM-HANDOFF-PROMPT.md)

To try it locally, run `python3 -m http.server` in this folder and open <http://localhost:8000>.
