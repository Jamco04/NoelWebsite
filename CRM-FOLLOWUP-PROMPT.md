# Follow-up prompt for the CRM chat (after commits 25d57f9 and 0a09ad7)

The CRM chat already built the email ingestion from the first prompt and updated the office address. Paste everything below the line into that chat. It covers only what's still missing.

---

## Follow-up: the CRM database as the single store for website queries, a direct endpoint, and real retention

Thanks for the website-form work (commit 25d57f9) and the address change (0a09ad7). This follow-up makes the CRM's database the one place website queries are kept, adds a direct route from the website, and puts the retention policy into effect. Read `docs/DATA-PROTECTION.md` first. Section 40 of the Data Protection Act 2018 stays the legal basis for casework. Keep to `AGENTS.md` and the existing tests' style, and open a PR with tests.

### 1. The database is the system of record

Every website query must end up as rows in the CRM's Supabase Postgres database (constituent, case, timeline event) and nowhere else for longer than it takes to ingest it. The website side now deletes its own copies (the Google Sheet rows and sent emails) after 30 days.

- Confirm the Supabase project's region is in the EU (ideally `eu-west-1`, Ireland), and state the region in `docs/DATA-PROTECTION.md` and on `/privacy`. If it isn't in the EU, tell James rather than migrating it.
- Add a nullable `privacy_ack_at timestamptz` column on `cases`. Set it from `Consent: Yes` and the received time, instead of only keeping a consent flag in the event meta.
- **Store website emails as metadata only.** At the moment `email_messages.body_text` keeps the whole email for case-linked messages, so each website query is stored twice. Once a website email has made its case, keep only the sender, subject, date and `WEB-` reference, with `body_text` null. The case already holds the description.
- `website_submissions` only needs to remember a reference long enough to stop a re-import. Delete its rows 60 days after `seen_at`, since the Sheet keeps rows for 30 days.

### 2. Remove the published-to-web Sheet link

The Sheet import accepts a "published to the web" CSV link. A published Google Sheet can be read by anyone who has the link, with no sign-in, so it would expose every submission's name, phone, email and description. That would be a personal data breach waiting to happen.

- Remove the published-link option and its hourly pull. Keep the manual CSV upload as an owner-only backup.
- If a link was ever saved, clear it from settings in the migration. Add a line to `docs/EMAIL-AUTOMATION.md` saying never to publish the Sheet.

### 3. Direct route from the website: `POST /api/public/website-form`

This is now the preferred route, because the data goes straight into the database with no copy in Gmail or a Sheet. The email route stays as the fallback.

- **Input:** `application/x-www-form-urlencoded`. The fields are the same as the email, with these names: `category`, `nature`, `area`, `first_name`, `last_name`, `email`, `phone`, `contact_method` (Email, Phone call or Text message), `description` (up to 3000 characters), `consent` (`Yes`), `search_text`, `website` (honeypot), `elapsed_ms`, `page`. At least one of email and phone is given.
- **CORS:** echo `Access-Control-Allow-Origin` only for origins in an allow-list setting. The defaults are `https://noelconnolly.ie` and `https://www.noelconnolly.ie`, and there should be a field to add the GitHub Pages preview origin. Answer `OPTIONS` too.
- **Spam:** a filled honeypot or `elapsed_ms < 3000` returns `{ "ok": true, "ref": "<random>" }` and stores nothing. Apply the `/contact` rate limits (5 an hour per connection, 100 a day overall).
- **Validation:** match `checkContactForm`. An unknown category becomes Other Query, and an unknown nature becomes Request for help.
- **Case creation:** use the same code that makes website cases from emails (`openWebsiteCase`, category mapping, area aliases), with the CRM case reference as the reference. Make sure both routes share one path.
- **Acknowledgement:** send the CRM's own bilingual acknowledgement if an email was given. The website sends nothing on this route.
- **Office notice (optional):** send one short email with no personal details, e.g. `New website query KD-2026-0042: Road Repair Query, Kildare`, plus a link.
- **Response:** `200 { "ok": true, "ref": "<case ref>" }`, or `200 { "ok": false, "error": "<plain-English message>" }`. The website shows `error` to the person. Never return stack traces or stored data.
- **Contact form switch:** honour the existing on/off setting.

### 4. Campaign items kept apart

The `categories.casework` flag exists but today only keeps Campaign out of the response-time figures. Campaign messages reveal political opinions, which are special category data, and section 40 doesn't cover campaigning.

- Hide non-casework cases from the main Cases list, the Overview counts, reminders and Insights. Give them their own list.
- Keep them only with the person's consent (the form's tick), and never set the "happy to get updates" flag from them.
- Give them their own retention period (below).

### 5. Retention: delete on schedule, not just list

Settings → Data & privacy currently says "Nothing is deleted automatically". Put this schedule into effect. Make every period editable in settings, and show each one on `/privacy`.

| Data | Kept | Then |
| --- | --- | --- |
| Open cases | While open | No activity for 12 months puts a case on a "Stale: review" list. Open cases are never deleted automatically. |
| Resolved casework | 24 months after resolution | Deleted |
| Campaign items | Until a date set in settings (default 6 months after the next election), or until the person asks | Deleted |
| A person with nothing left | | Deleted with their last case |
| Website emails after ingestion | Metadata only | Deleted with the case |
| `website_submissions` rows | 60 days | Deleted |
| Skipped and other emails | 90 days (as now) | Deleted |
| Activity log | 24 months | Deleted, except erasure and export entries, which are kept 6 years with no personal details |
| Backups | Supabase's 7 days | Aged out |

How it runs:

- A daily step in the existing cron (`/api/cron/sync`) finds what's due.
- The Overview shows "Due for deletion in the next 30 days", with a count and a link to the list.
- The owner can mark a case **Keep** with a required reason, such as an ongoing complaint or legal matter. That holds it for 12 more months and is logged.
- On the due date the job deletes the case, its timeline and its emails, then anyone left with nothing.
- The job logs counts only ("Deleted 14 resolved cases older than 24 months"), never names or details.
- Before deleting a case, write an anonymous statistics row (month, category, area, source, days to first reply, outcome) so Insights keeps its history. The row must hold nothing that identifies a person.
- A setting turns automatic deletion off. It defaults to **on**; say so in `docs/DATA-PROTECTION.md`.

### 6. Rights, notice and records

- **Access requests:** "Download their data" includes the website fields (WEB- reference, nature, preferred contact, privacy acknowledgement time), campaign items, and each case's deletion date.
- **`/privacy`:** match the website's notice (noelconnolly.ie/privacy.html). It should cover:
  - section 40 for casework, and consent for campaign items;
  - the retention table above;
  - the processors (Vercel, Supabase, Google for the email fallback);
  - the Data Protection Commission (21 Fitzwilliam Square South, Dublin 2, D02 RD28);
  - replies to requests within one month.
- **`docs/DATA-PROTECTION.md`:**
  - Add a record-of-processing entry for the website form: its purpose, legal basis, data, recipients, retention, and where the data is held.
  - Add a note that Google is a processor on the email fallback. That needs a Google Workspace account with the Cloud Data Processing Addendum, not a personal Gmail.
  - Add a one-paragraph DPIA screening. Health and disability data from the public is a reason to do a short DPIA, so list the risks and these controls.

### 7. Tests

- **Endpoint:**
  - a good submission creates a case and returns `{ ok, ref }`;
  - phone-only submissions work;
  - the honeypot and fast submissions store nothing;
  - the rate limit applies;
  - an unknown category becomes Other;
  - CORS only allows listed origins.
- **Storage:**
  - a website email's `body_text` is null after ingestion;
  - `privacy_ack_at` is set;
  - `website_submissions` rows are pruned after 60 days;
  - the published-link import is gone.
- **Campaign:** campaign items are left out of Cases, Overview, reminders and Insights.
- **Retention:**
  - due cases are deleted;
  - Keep holds a case for 12 months;
  - people left with nothing are removed;
  - the statistics row has no identifying fields;
  - the log holds counts only;
  - with the setting off, nothing is deleted.

### Notes

- Don't change the email format alone. The website's `apps-script/Code.gs` (in `Jamco04/NoelWebsite`) and the parser change together.
- When the endpoint is deployed, tell James its full URL. It goes into `FORM_ENDPOINT` in the website's `assets/js/config.js`.
