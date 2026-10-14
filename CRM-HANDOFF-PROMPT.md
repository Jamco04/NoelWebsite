# Hand-off prompt: website form ingestion, storage and retention for the Constituency CRM

Paste everything below the line into the Claude chat that maintains the Constituency CRM (`Jamco04/constituency-crm`). It replaces the earlier hand-off prompt. If that one was already sent, send this as a follow-up and say it supersedes it.

---

## Context

Cllr Noel Connolly's new website (noelconnolly.ie, repo `Jamco04/NoelWebsite`) has a contact form. Please make the CRM the one place these queries are stored, and make storage and retention meet the office's data protection duties.

Read `docs/DATA-PROTECTION.md` first. Section 40 of the Data Protection Act 2018 is the legal basis for casework, and most of the groundwork (access limits, erasure, exports, 24-month review list) already exists. This work fills the gaps for the website form. Keep to `AGENTS.md`, `docs/ARCHITECTURE.md` and the existing tests' style, and open a PR with tests.

Office details have changed. The office address is **4 Market Square, Kildare, R51 X458, Ireland**. Update Settings → Office details and the defaults in `db/migrations/0004_noel_connolly_office.ts` (via a new migration, not by editing the old one), and anywhere else it appears.

## Two ways the form can reach the CRM

**A. Direct to the CRM (preferred).** The website posts the form straight to a new public CRM endpoint. This is the best option for data protection: one copy of the data, held in Ireland, under the CRM's access controls and retention. There's no copy left in a personal Gmail account (which has no data processing agreement) or in a Google Sheet.

**B. By email (fallback, already built).** A Google Apps Script on Noel's Google account emails the office mailbox in a fixed format, sends the person a bilingual confirmation and keeps a backup Sheet. It now deletes its own copies after 30 days. The CRM must still be able to ingest these emails, in case A isn't live yet or is down.

Build both. Once A is live, the website's `assets/js/config.js` points `FORM_ENDPOINT` at it.

## The form's fields (identical for A and B)

| Field | Values |
| --- | --- |
| `category` | Exactly one of: Housing Query, Planning Query, Road Repair Query, Peace Commissioner Query, Medical Card Query, Health Query, Business Query, Community Support Query, Education Query, Childcare Query, Home Help/Carers Query, Infrastructure Query, Disability Query, Council Grants Query, Other Query, Irish Language Query, Campaign Query |
| `nature` | Request for help, Information or advice, Report a problem, Follow-up on an existing query, Complaint, Invitation or event, Feedback or suggestion |
| `area` | Free text (suggestions: Kildare Town, Newbridge, Kilcullen, Rathangan, Monasterevin, Suncroft, Brownstown, The Curragh, Cherryville, Nurney, Kildangan, Lackagh, Milltown, Athgarvan, Allen, Straffan, Kilmeage, Two Mile House, Ballysax, Naas, Athy, Clane, Sallins, Prosperous, Maynooth, Celbridge, Leixlip, Kilcock, Castledermot, Kill, Johnstown, Robertstown, Carbury, Ballymore Eustace, Outside Co. Kildare) |
| `first_name`, `last_name` | Text, required |
| `email`, `phone` | At least one is given |
| `contact_method` | Email, Phone call or Text message |
| `description` | Up to 3000 characters |
| `consent` | `Yes`: the person ticked that they've read the privacy notice and that their details may go to the public body responsible |
| `search_text` | What they typed in the topic search, may be empty |
| `website` | Honeypot: anything in it means spam |
| `elapsed_ms` | Milliseconds the form was open: under 3000 means spam |
| `page` | The page URL |

## A. Public endpoint: `POST /api/public/website-form`

- **Request:** `application/x-www-form-urlencoded` with the fields above. It's a CORS "simple request", so there's no preflight, but answer `OPTIONS` anyway.
- **CORS:** `Access-Control-Allow-Origin` echoes the request origin only if it's in an allow-list setting (default `https://noelconnolly.ie`, `https://www.noelconnolly.ie`). Add a field for the GitHub Pages preview origin.
- **Spam:** if the honeypot is filled or `elapsed_ms < 3000`, return `{ "ok": true, "ref": "<random>" }` and store nothing.
- **Rate limits:** reuse `lib/rate-limit.ts`, at 5 an hour per connection and 100 a day overall, the same as `/contact`.
- **Validation:** match `checkContactForm`. Unknown category becomes Other Query, unknown nature becomes Request for help.
- **Case creation:** create the case as in "Creating the case" below.
- **Acknowledgement:** send the CRM's own bilingual acknowledgement (with the CRM reference) if an email was given, under the existing once-a-week rule. The website sends nothing itself in mode A.
- **Response:** `200 { "ok": true, "ref": "<CRM case ref>" }`, or `200 { "ok": false, "error": "<plain-English message>" }` for validation errors. The website shows `error` to the person. Never return stack traces or any stored data.
- **Notifying the office (optional):** email the office a short notice with no personal details: `New website query KD-2026-0042: Road Repair Query, Kildare Town`, plus a link to the case. The full details stay in the CRM.
- **Contact form setting:** honour the existing switch, so it can be turned off under Settings → Office details.

## B. Ingesting the fallback emails

**Subject:** `[Website] [<Category>] [<Nature>] [<Area>] <First> <Last>`. The area has `[` and `]` stripped.

**From:** the Google account running the script (usually Noel's Gmail, possibly the same as the CRM mailbox). The display name is `noelconnolly.ie contact form`.

**Reply-To:** the constituent's email, or the office mailbox itself when they gave only a phone number.

**Plain-text body:**

```
NOELCONNOLLY.IE CONTACT FORM
Reference: WEB-20261013-QSLY
Received: 13/10/2026 15:34
Category: Road Repair Query
Nature of request: Report a problem
Area: Kildare Town
Name: Mary Murphy
First name: Mary
Last name: Murphy
Email: mary@example.com
Phone: 087 123 4567
Preferred contact: Email
Consent: Yes
Searched for: pothol
--- Description ---
Big pothole outside the house, getting worse.
--- End ---
```

`Received` is Europe/Dublin local time, `dd/MM/yyyy HH:mm`.

The person has already had a bilingual confirmation quoting the `WEB-` reference, and its Reply-To is the office mailbox.

What today's code gets wrong, from reading `src/lib/mail/processor.ts`:

- Phone-only messages are skipped as "Sent from this mailbox", because Reply-To equals the mailbox address.
- Email messages become cases with a guessed category and a name taken from the email address, and the phone, area and reference are lost.
- The person gets a second acknowledgement.

To fix it:

1. **Parser.** Add `src/lib/mail/website-form.ts` with `parseWebsiteFormEmail(subject, bodyText)`. It returns the fields or `null`, and matches only when the subject starts with `[Website] [` and the first non-empty body line is `NOELCONNOLLY.IE CONTACT FORM`. It must tolerate CRLF and trailing spaces.
2. **Order.** Run the parser before the own-address, team, automated and ignore-list rules, in both the inbox and sent paths. Dedupe on the `WEB-` reference, so one submission seen in Inbox and Sent makes one case.
3. **Case.** Create the case as below, with `source = "web"`.
4. **No second acknowledgement.** Don't send the CRM acknowledgement for these emails; the outcome reads "New case from the website form; the website already confirmed".
5. **Keep only metadata.** Once the case is created, store the email as metadata only (sender, subject, date, the `WEB-` reference), not its body. The case already holds the content, and a second copy only adds to what has to be protected and deleted.
6. **Replies.** A later email quoting `WEB-yyyymmdd-XXXX` must find the case (extend `findCaseByReference`).

## Creating the case (shared by A and B)

- **Constituent:** use `findOrCreateConstituent` with full name, email, phone and area, so a returning person is matched by email or phone.
- **Case fields:**
  - `subject`: `<Nature>: <first line of the description, max 80 chars>`
  - `description`: the description
  - `source`: `"web"`
  - `needsReply`: true
  - `needsTriage`: true, but with the category and area filled in
  - `openedAt`: the received time
- **Category mapping:** export the mapping as one constant and test it. If a mapped category is missing or inactive, fall back to `suggestCategory`, then to Other.

  | Website category | CRM category |
  | --- | --- |
  | Housing Query | Housing |
  | Planning Query | Planning |
  | Road Repair Query | Roads & Transport |
  | Peace Commissioner Query | Peace Commissioner |
  | Medical Card Query | Medical Card |
  | Health Query | Health |
  | Business Query | Employment & Tax |
  | Community Support Query | Community & Grants |
  | Education Query | Education |
  | Childcare Query | new: Childcare |
  | Home Help/Carers Query | new: Home Help & Carers |
  | Infrastructure Query | Water & Utilities |
  | Disability Query | new: Disability |
  | Council Grants Query | Community & Grants |
  | Irish Language Query | new: Irish Language |
  | Campaign Query | new: Campaign (see below) |
  | Other Query | Other |

- **Area:** match case-insensitively against `areas.name`, with aliases: `Kildare Town` → `Kildare`. If nothing matches, set no area and keep the typed text in the case's meta.
- **New nullable columns on `cases`** (one migration):
  - `external_ref` (the `WEB-` reference in mode B; unique where not null);
  - `preferred_contact`;
  - `request_nature`;
  - `privacy_ack_at` (when the person ticked the privacy box; set from `consent = Yes` and the received time).
- **Inbound event:** add one with `meta: { searchedFor, page }`.
- **Display:**
  - a "Website" badge for `source = web` on case rows and the case page;
  - the nature under the subject;
  - preferred contact as a chip by the phone and email, linking to `tel:` for a phone call or text;
  - a Cases filter for Website;
  - an Overview count "New from the website";
  - website cases included in Insights by category and area.

## Campaign Query is not casework

Section 40 covers helping constituents. It doesn't cover campaigning, and an offer to volunteer reveals a political opinion, which is special category data.

- Mark the `Campaign` category as **non-casework** with a new `categories.kind` column, `casework` or `campaign`.
- Campaign items are hidden from casework lists, reminders, response-time stats and Insights, and are shown on their own list.
- They are kept only with the person's consent (the form's tick), and never feed the "happy to get updates" list automatically.
- They have their own retention (below).

## Retention: make the policy real

Today Settings → Data & privacy only *lists* resolved cases older than 24 months, and nothing is deleted. Implement this policy, with every period editable in settings and shown on the public privacy notice:

| Data | Kept | Then |
| --- | --- | --- |
| Open cases | While open | Open cases with no activity for 12 months appear on a "Stale: review" list. They are never deleted automatically. |
| Resolved casework | 24 months after resolution | Deleted |
| Campaign items | Until a date set in settings (default: 6 months after the next election) or until the person asks | Deleted |
| A person with no remaining cases or campaign items | | Deleted with their last case |
| Website-form emails after ingestion | Metadata only | Deleted with the case |
| Skipped and other emails | 90 days (existing) | Deleted |
| Activity log | 24 months | Deleted, except entries recording erasures and exports, which are kept 6 years with no personal details |
| Backups | 7 days (Supabase) | Aged out |

How the deletion should work:

- A daily job in the existing cron (`/api/cron/sync`) finds what's due.
- The Overview shows "Due for deletion in the next 30 days" with a count and a link to the list.
- The owner can mark a case **Keep** with a required reason (for example an ongoing complaint or legal matter). That holds it for another 12 months and records it in the activity log.
- On the due date the job deletes the case, its timeline and its stored emails, then any person left with nothing. It logs only counts ("Deleted 14 resolved cases older than 24 months") and never names or details.
- A setting can turn automatic deletion off, leaving list-only review as today. Default it **on**, and say so in `docs/DATA-PROTECTION.md`.
- Before deleting a case, keep an anonymous statistic row (month, category, area, source, days to first reply, outcome) so Insights still has history. The row must contain nothing that identifies a person.

## Rights, transparency and records

- **Access requests:** "Download their data" must include the new fields (website reference, preferred contact, nature, privacy acknowledgement time), campaign items, and the retention date that applies to each case.
- **Privacy notice:** update `/privacy` so it matches the website's own notice at noelconnolly.ie/privacy.html. It should cover section 40 for casework, consent for campaign items, the retention table above, the processors, the Data Protection Commission (21 Fitzwilliam Square South, Dublin 2, D02 RD28) and the one-month response time for requests.
- **Docs:** in `docs/DATA-PROTECTION.md`:
  - Add a short **record of processing** entry for the website form: its purpose, legal basis, data, recipients, retention, and where the data is held.
  - Add a note that **Google is a processor** in fallback mode B. It needs either a Google Workspace account with the Cloud Data Processing Addendum accepted, or mode A instead of a personal Gmail.
  - Add a one-paragraph **DPIA screening**: health and disability data from the public at scale is a reason to do a short DPIA. Summarise the risks and the controls listed here.

## Tests (vitest, next to `tests/email-automation.test.ts`)

- **Endpoint (A):**
  - a good submission creates a case and returns `{ ok, ref }`;
  - the honeypot and fast submissions store nothing;
  - the rate limit applies;
  - an unknown category becomes Other;
  - CORS only allows listed origins;
  - phone-only submissions work.
- **Parser and email (B):**
  - a full message, no email, no phone, a multi-line description and CRLF line endings;
  - non-matching emails return `null`;
  - a phone-only email creates a case;
  - an Inbox and Sent duplicate creates one case;
  - no second acknowledgement is sent;
  - the body isn't stored after ingestion;
  - a reply quoting `WEB-…` links to the same case.
- **Mapping:** categories, area aliases, and campaign items kept out of casework lists and stats.
- **Retention:**
  - due cases are deleted;
  - Keep holds a case for 12 months;
  - people with no remaining cases are removed;
  - the anonymous statistic row has no identifying fields;
  - the log records counts only;
  - with the setting off, nothing is deleted.

## Notes

- Don't change the website email format on the CRM side alone. If it needs to change, change `apps-script/Code.gs` in `Jamco04/NoelWebsite` and the parser together.
- When the endpoint is live, tell James its full URL so it can go into the website's `assets/js/config.js`.
