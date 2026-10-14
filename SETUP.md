# Going live: setup guide

The site is plain HTML, CSS and JavaScript with no build step. There are four jobs, done in this order:

1. Switch the contact form on (the CRM's website-form address, or Google Apps Script).
2. Put the site on GitHub Pages (about 10 minutes).
3. Save the photos from the old site (5 minutes, **before** step 4).
4. Point noelconnolly.ie at the new site (DNS at the .ie registrar, about 15 minutes plus waiting).

Until step 1 is done, the contact form runs in **preview mode**. It can be filled in end to end, nothing is sent, and the last screen shows the email the team would have received.

---

## 1. Switch the contact form on

There are two ways, and the form works with either. Only the address in `assets/js/config.js` changes.

- **Recommended: send the form straight to the CRM.** Once the CRM chat has built the `/api/public/website-form` address from `CRM-HANDOFF-PROMPT.md`, put that address in `FORM_ENDPOINT` and you're done. Each query is then stored once, in the CRM (hosted in Ireland), and the CRM sends the bilingual confirmation. Skip the rest of this step.
- **Fallback: Google Apps Script**, described below. Use it if the CRM endpoint isn't ready yet. It emails the office and the CRM picks the message up from the inbox.

**Data protection note.** A personal `@gmail.com` account has no data processing agreement with Google, which the GDPR expects when a service holds other people's personal data for you. If you use the Apps Script route for more than a short while, run it on a Google Workspace account (from about €7 a month), which comes with Google's data processing terms. The script keeps only 30 days of copies either way (see *Retention* below).

### Google Apps Script

This runs free on Noel's Google account. A personal Gmail can send about 100 emails a day, and each message uses two: one to the team and one confirmation to the sender. That's roughly 50 messages a day.

1. Sign in to Noel's Google account and go to <https://script.google.com>. Click **New project** and name it `noelconnolly.ie contact form`.
2. Delete what's in `Code.gs`, then paste in the whole of [`apps-script/Code.gs`](apps-script/Code.gs). Save.
3. At the top of the file, check `TEAM_EMAIL`. That's where messages go, so it should be the inbox the team and the CRM read. You can also set it without editing code, under **Project Settings → Script Properties**: add `TEAM_EMAIL` with the address.
4. Choose `setup` in the function drop-down and click **Run**. Google asks for permission: choose Noel's account, then **Advanced → Go to … (unsafe) → Allow**. The warning appears because the script is new and unreviewed, and it is normal. This step creates the Google Sheet (the log shows its link, and it's also in Noel's Drive) and schedules the daily clean-up described under *Retention*.
5. Choose `sendTest` and click **Run**. Check the team inbox: you should get the formatted test message and the bilingual confirmation.
6. Click **Deploy → New deployment**. Pick type **Web app**, set *Execute as* to **Me** and *Who has access* to **Anyone**, then click **Deploy**. Copy the **Web app URL**, which ends in `/exec`.
7. In the website, open [`assets/js/config.js`](assets/js/config.js) and replace `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` with that URL. Commit the change.
8. On the live site, send a real test through the contact page.

**If you change `Code.gs` later**, use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. That keeps the same URL. A *New deployment* gives a new URL, which would then need to go back into `config.js`.

**Before launch:** have a fluent Irish speaker check the Irish text in `confirmationEmail()` in `Code.gs`. It was written carefully but has not been checked.

**Turning the confirmation off.** If the CRM is set to send its own acknowledgement, add a Script Property `SEND_AUTO_REPLY` with the value `false`, so people don't get two. `CRM-HANDOFF-PROMPT.md` covers this from the CRM side.

**Spam and limits.** The script ignores submissions that fill in a hidden field or arrive faster than a person could type. It allows 5 messages an hour per email address or phone number. If the daily email limit is reached, the submission is still saved in the Sheet, marked "No (daily email limit reached)".

### Retention

The Sheet and the sent confirmations are delivery copies, not the record. The record is the CRM. So `setup` installs a daily job (`retentionCleanup`, around 3am) that:

- deletes Sheet rows older than **30 days**;
- moves the script's sent emails older than 30 days to the Bin (Gmail empties the Bin after another 30 days).

To change the period, add a Script Property `RETENTION_DAYS`. To also clear the team's inbox copies of website messages after that period (only once you're sure the CRM has ingested them), add `PURGE_INBOX_COPIES` with the value `true`. You can see the job under **Triggers** (the clock icon) in the script editor.

### Outgrowing the free tier

If there are regularly more than about 50 messages a day:

- **Google Workspace** (paid) on Noel's account raises the Apps Script limit to 1,500 emails a day, and nothing else changes.
- **Brevo** has 300 emails a day free and paid plans above that. You'd keep the Apps Script and replace the two `MailApp.sendEmail` calls with a call to Brevo's API, storing the API key in Script Properties, never in the website.
- **EmailJS** can send from the browser with no script (200 a month free). But it can't write to the Sheet, and its limits are lower. It's not recommended here.

---

## 2. Put the site on GitHub Pages

The code is in **`Jamco04/NoelWebsite`**.

**Whose account.** You wanted it on Noel's GitHub account. Either move it there with **Settings → General → Danger Zone → Transfer ownership** and enter Noel's username, or leave it on James's account. Both work the same.

**Private or public.** GitHub Pages on a **private** repo needs GitHub Pro, which the Student Developer Pack includes. Check at <https://github.com/settings/billing> on the account that will own the repo; it should say "Pro". Alternatively, make the repo **public**. The site has no secrets in it (the Apps Script URL is meant to be public), and public repos get Pages free on any plan.

Then:

1. Merge the pull request into `main`.
2. In the repo, go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: `main`**, folder **`/ (root)`**, and click **Save**.
3. After a minute or two the page shows the address, e.g. `https://<owner>.github.io/NoelWebsite/`. Open it and check every page.

The repo includes an empty `.nojekyll` file, so GitHub serves the files exactly as they are.

---

## 3. Save the photos from the old site (before step 4)

The new pages use local copies of the old site's photos, and fall back to the old addresses until those copies exist. Once the domain moves, the old addresses stop working, so save them first:

| Save this | As this file in the repo |
| --- | --- |
| <https://noelconnolly.ie/resources/Noel%20Connolly2.png> | `assets/img/noel-connolly.png` |
| <https://noelconnolly.ie/resources/Peace%20Commissioner%20%281%29.png.opt556x765o0%2C0s556x765.png> | `assets/img/peace-commissioner.png` |
| <https://assets.yolacdn.net/template_assets/maddux/resources/maddux_img_23.jpg?timestamp=1517838856028> | `assets/img/kildare.jpg` |

Open each link, right-click the image, choose **Save image as…**, then upload the files to `assets/img/` in GitHub (**Add file → Upload files**). The third one is the old site's background photo from its Yola template. A real photo of Kildare or of Noel would be better, saved under the same name.

---

## 4. Point noelconnolly.ie at the new site

This is done at whoever manages the domain's DNS. That's usually the .ie registrar (e.g. Blacknight, Register.ie, Hosting Ireland, Letshost). The current site is on Yola, so check whether Yola manages it.

**Important: don't touch the `MX` records.** They deliver email for `mail@noelconnolly.ie`. Only change the records listed here.

1. **Verify the domain with GitHub** (stops anyone else claiming it). On the GitHub account that owns the repo, go to **Settings (profile) → Pages → Add a domain**, enter `noelconnolly.ie`, and add the `TXT` record GitHub shows at the registrar. Click **Verify**.
2. At the registrar's DNS settings for noelconnolly.ie:
   - **Remove** any existing `A`, `AAAA` or `CNAME` records for `@` (the bare domain) and `www`. These point at the old Yola site.
   - **Add** these records:

     | Type | Name / Host | Value |
     | --- | --- | --- |
     | A | @ | 185.199.108.153 |
     | A | @ | 185.199.109.153 |
     | A | @ | 185.199.110.153 |
     | A | @ | 185.199.111.153 |
     | AAAA | @ | 2606:50c0:8000::153 |
     | AAAA | @ | 2606:50c0:8001::153 |
     | AAAA | @ | 2606:50c0:8002::153 |
     | AAAA | @ | 2606:50c0:8003::153 |
     | CNAME | www | `<owner>.github.io` (Noel's or James's GitHub username, with no repo name) |

     Some registrars want the bare domain written as blank or `noelconnolly.ie` instead of `@`.
3. In the repo, go to **Settings → Pages → Custom domain**, enter `noelconnolly.ie` and **Save**. GitHub adds a `CNAME` file to the repo.
4. Wait. DNS changes take from a few minutes to a few hours. When the Pages settings show the DNS check as successful, tick **Enforce HTTPS**. The certificate can take up to an hour to appear.
5. Check <https://noelconnolly.ie> and <https://www.noelconnolly.ie>; both should show the new site.
6. If Yola was hosting the old site, cancel that plan only after the new site is live. Make sure cancelling doesn't also cancel the domain or the email.

---

## Editing the site later

- **Text** is in the `.html` files. Edit them on GitHub (pencil icon) and the site updates a minute after you commit.
- **Recent Activities:** copy an `<article class="entry">` block in `activities.html` and change it.
- **Social links:** replace each `href="#"` in `social.html`.
- **Contact topics and search words:** these are in `CATEGORIES` and `FAQS` at the top of `assets/js/contact.js`. If you rename a category, change the same list in `apps-script/Code.gs` and tell the CRM chat, because the CRM reads category names from the emails.
- **Colours and fonts** are set once, at the top of `assets/css/style.css`. The fonts (Barlow Condensed and Source Sans 3) are stored in `assets/fonts/`, so the site makes no requests to Google Fonts.
- **Office address** appears in every page's footer, in `index.html`, `contact.html` and `privacy.html`, and in the confirmation email in `apps-script/Code.gs`.
- **Privacy notice:** `privacy.html` is a draft. Have it checked before launch, and keep its retention periods the same as the CRM's.

## Cookies and privacy

The site sets **no cookies** and loads nothing from other companies: fonts are stored with the site, the map is a link rather than an embedded Google Map, and social pages are links rather than embedded feeds. That's why there's no cookie banner. If you later add an embedded map, video, social feed or analytics, you'll need a consent banner first, so it's simpler to keep linking out.
