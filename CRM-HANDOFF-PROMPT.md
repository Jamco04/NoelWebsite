# Hand-off prompt: make the Constituency CRM ingest noelconnolly.ie contact form messages

Paste everything below the line into the Claude chat that maintains the Constituency CRM (`Jamco04/constituency-crm`).

---

## Context

Cllr Noel Connolly's new website (noelconnolly.ie, repo `Jamco04/NoelWebsite`) has a new contact form. It doesn't post to the CRM directly. A Google Apps Script web app on Noel's Google account receives each submission and does three things:

1. It sends **one email to the office mailbox** in a fixed, machine-readable format (below).
2. If the person gave an email address, it sends them a **bilingual EN/GA confirmation** with a website reference such as `WEB-20261013-QSLY`. That message's Reply-To is the office mailbox.
3. It **appends a row to a Google Sheet** ("noelconnolly.ie contact form submissions", tab `Submissions`) as a backup log.

Please change the CRM so that these messages become well-formed cases. The constituent, category, area, phone, preferred contact method and website reference should all be filled in from the structured fields rather than guessed. They should also display nicely. Don't break any existing email handling, and keep to the repo's conventions in `AGENTS.md` and `docs/ARCHITECTURE.md`. Open a PR with tests.

## The email format (a contract: parse exactly this)

**Subject**

```
[Website] [<Category>] [<Nature of request>] [<Area>] <First name> <Last name>
```

Example: `[Website] [Road Repair Query] [Report a problem] [Kildare Town] Mary Murphy`

The area has any `[` and `]` removed before sending, so the bracket groups are safe to split on.

**Envelope**

- **From:** the Google account running the script. This is usually Noel's Gmail, and may be the same address as the CRM mailbox. The display name is `noelconnolly.ie contact form`.
- **To:** the office mailbox (`TEAM_EMAIL` in the script, default `mail@noelconnolly.ie`).
- **Reply-To:** the constituent's email. If they only gave a phone number, Reply-To is the office mailbox itself.

**Plain-text body** (the HTML part is a styled table of the same fields; parse the text part):

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
Big pothole outside number 12 on Claregate Street, getting worse.
(may be several lines, up to 3000 characters)
--- End ---
```

- `Received` is Europe/Dublin local time, `dd/MM/yyyy HH:mm`.
- `Email` or `Phone` may be empty, but never both.
- `Preferred contact` is one of `Email`, `Phone call` or `Text message`.
- `Searched for` is what the person typed in the topic search, and may be empty. It's useful for tuning keywords.
- `Consent: Yes` means they agreed the office can use their details to deal with the query. The form can't be sent without it.

**Category** is always exactly one of these 17 values:

Housing Query, Planning Query, Road Repair Query, Peace Commissioner Query, Medical Card Query, Health Query, Business Query, Community Support Query, Education Query, Childcare Query, Home Help/Carers Query, Infrastructure Query, Disability Query, Council Grants Query, Other Query, Irish Language Query, Campaign Query

**Nature of request** is always one of these:

Request for help, Information or advice, Report a problem, Follow-up on an existing query, Complaint, Invitation or event, Feedback or suggestion

**Area** is free text with suggestions. The suggestions are Kildare Town, Newbridge, Kilcullen, Rathangan, Monasterevin, Suncroft, Brownstown, The Curragh, Cherryville, Nurney, Kildangan, Lackagh, Milltown, Athgarvan, Allen, Straffan, Kilmeage, Two Mile House, Ballysax, Naas, Athy, Clane, Sallins, Prosperous, Maynooth, Celbridge, Leixlip, Kilcock, Castledermot, Kill, Johnstown, Robertstown, Carbury, Ballymore Eustace and Outside Co. Kildare.

## Why today's code isn't enough

I read `src/lib/mail/processor.ts` and `src/lib/contact-form.ts` on `main`:

- When the person gives an email, `constituentAddress()` takes the Reply-To, so a case is created. But its category comes from keyword guessing, the constituent's name comes from the email address, and the phone, area, preferred contact and website reference are lost. **The CRM's own acknowledgement is also sent, so the person gets two confirmations.**
- When the person gives **only a phone number**, Reply-To equals the mailbox's own address, and `processInbound` skips the email as "Sent from this mailbox". **That query never reaches the CRM.**
- When the script runs on the same Gmail account the CRM reads, Gmail can file the message as both sent and inbox, so it may arrive through `processSent`. Recognising the format must not depend on the folder or the sender.

## What to build

1. **Recognise website-form emails first.**
   - Add `src/lib/mail/website-form.ts` with `parseWebsiteFormEmail(subject, bodyText)`. It returns the typed fields above, or `null`.
   - It matches when the subject starts with `[Website] [` **and** the text body's first non-empty line is `NOELCONNOLLY.IE CONTACT FORM`.
   - Parse the `Key: value` lines until `--- Description ---`, then everything up to `--- End ---` as the description.
   - Be tolerant of `\r\n`, quoted-printable soft breaks already decoded, and trailing whitespace.
   - In `processMessages`/`processInbound`, check this **before** the own-address, team, automated and ignore-list rules, whichever folder the message came from. Dedupe on the `WEB-` reference as well as the message id, so the same submission seen in Inbox and Sent makes one case.

2. **Create the case from the fields** using `createCase`.
   - **Constituent:** `fullName` = First + Last, plus email, phone and area. Use `findOrCreateConstituent` so repeat senders match an existing person by email or phone.
   - **Subject:** `<Nature of request>: <first line of description, trimmed to 80 chars>`, or reuse `subjectFrom`.
   - **Description:** the description text.
   - **Category:** map with the table below, set as `categoryId` and `suggestedCategoryId`. Keep `needsTriage: true` so it still appears under "New from email to review", but pre-filled.
   - **Area:** match case-insensitively against `areas.name`, with aliases (`Kildare Town` → `Kildare`, `The Curragh` → `Curragh` if present). If nothing matches, leave `areaId` null and put the typed area in the description footer.
   - **Source:** `"web"`, the same as the built-in `/contact` form.
   - `needsReply: true`, `openedAt` = the parsed `Received` time, falling back to the email date.
   - Add an `inbound` case event with `meta: { websiteRef, nature, preferredContact, searchedFor, consent: true, area: <typed area> }`.

3. **Store and use the website reference.**
   - Add a nullable `external_ref` column on `cases` (new migration in `db/migrations/`, unique per team where not null), set to the `WEB-…` value.
   - Extend `findCaseByReference` so that a later email quoting `WEB-yyyymmdd-XXXX` finds the case. People will reply to the website confirmation, and those replies land in the office mailbox.
   - Show it on the case page next to the CRM reference.

4. **Don't double-acknowledge.**
   - Add a setting under Settings → Email & automation: "Website form sends its own confirmation" (default **on**).
   - When it's on, website-form cases get no CRM acknowledgement, and the outcome reads `New case from the website form; the website already confirmed`.
   - When it's off and an email was given, send the normal acknowledgement. Its once-a-week rule still applies.
   - The website's confirmation is on by default, and can be turned off there with `SEND_AUTO_REPLY=false` if the office would rather the CRM's acknowledgement (with the CRM reference) be the only one.

5. **Preferred contact method.**
   - Store `preferredContact` (Email, Phone call or Text message) on the case, either as a column or in the event meta.
   - Show it as a chip in the case header beside the phone and email, with a `tel:` link when it's a phone call or text.
   - Use it in the Overview's "who to reply to" list ("Prefers a phone call").

6. **Make it look good in the UI.**
   - Add a small **"Website"** badge on case rows and the case page for source `web`.
   - Show the nature of request as a secondary label under the subject.
   - Add a filter on the Cases list for source = Website.
   - On the Overview, add a count tile: "New from the website (today / this week)".
   - In Insights, include website cases by category and by area. Area matching from step 2 feeds the Kildare map.

7. **Categories.** These are the website-to-CRM mappings. Add the missing CRM categories in a migration (colours and keywords editable later in Settings → Categories, areas & departments):

   | Website category | CRM category |
   | --- | --- |
   | Housing Query | Housing |
   | Planning Query | Planning |
   | Road Repair Query | Roads & Transport |
   | Peace Commissioner Query | Peace Commissioner |
   | Medical Card Query | Medical Card |
   | Health Query | Health |
   | Business Query | Employment & Tax (or new **Business**) |
   | Community Support Query | Community & Grants |
   | Education Query | Education |
   | Childcare Query | **new: Childcare** |
   | Home Help/Carers Query | **new: Home Help & Carers** |
   | Infrastructure Query | Water & Utilities (or new **Infrastructure**) |
   | Disability Query | **new: Disability** |
   | Council Grants Query | Community & Grants |
   | Irish Language Query | **new: Irish Language** |
   | Campaign Query | **new: Campaign**. These are political rather than casework: exclude them from casework reminders and response-time stats, or route them to a separate list. |
   | Other Query | Other |

   Keep the mapping in one exported constant with a test. If a mapped category is missing or inactive, fall back to `suggestCategory` and then to Other.

8. **Optional backup import from the Google Sheet.**
   - Settings → Data: "Import website submissions" accepts a CSV export of the `Submissions` tab, or a published-to-web CSV URL of it.
   - The columns, in order: Received, Reference, Category, Nature of request, Area, First name, Last name, Email, Phone, Preferred contact, Description, Consent, Searched for, Team email sent, Confirmation sent, Source page, CRM status, CRM case ref.
   - Dedupe on `Reference` and `cases.external_ref`. Rows with `Team email sent` = `No (daily email limit reached)` are exactly the ones that need importing.
   - A scheduled pull from the published CSV URL in the existing cron (`/api/cron/sync`) would make this automatic. If you do that, put the URL in settings, not in code.

9. **Tests** (vitest, alongside `tests/email-automation.test.ts`):
   - the parser: a full message, no email, no phone, a multi-line description, CRLF line endings, a subject with odd spacing, and non-matching emails returning `null`;
   - a phone-only submission (Reply-To = own address) creates a case;
   - one submission seen in both Inbox and Sent creates one case;
   - no CRM acknowledgement when the setting is on;
   - a reply quoting `WEB-…` is added to the same case;
   - the category and area mappings, including the fallback to Other;
   - the CSV import's dedupe.

10. **Docs.** Add a "Website contact form (noelconnolly.ie)" section to `docs/EMAIL-AUTOMATION.md` describing all of this in the same plain-English style.

## Notes

- The office address in the CRM's office settings (`0004_noel_connolly_office.ts`) is "Market Square, Kildare Town". The website shows **6 Claregate St, Kildare Town, R51 Y243**, taken from the current noelconnolly.ie. Check with James which is right and update the setting if needed.
- Don't change the website email format on the CRM side. If the format needs to change, change the Apps Script (`apps-script/Code.gs` in `Jamco04/NoelWebsite`) and this parser together.
