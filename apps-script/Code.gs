/**
 * noelconnolly.ie contact form handler (Google Apps Script web app).
 *
 * The website POSTs the form here. For each message this script:
 *   1. emails the team a consistently formatted message (easy for the CRM to read),
 *   2. emails the sender a confirmation in English and Irish,
 *   3. adds a row to a Google Sheet, so nothing is lost and the CRM can import it.
 *
 * Runs free on a personal Gmail account (about 100 emails a day; each message
 * uses two: one to the team, one confirmation). See SETUP.md for deployment.
 */

// ----- Settings --------------------------------------------------------------
// Edit these, or set Script Properties with the same names (Project Settings →
// Script Properties), which take priority and survive pasting in a new version.
var DEFAULTS = {
  TEAM_EMAIL: "mail@noelconnolly.ie",   // where messages go (the CRM's mailbox)
  SEND_AUTO_REPLY: "true",              // "false" if the CRM sends its own acknowledgement
  OFFICE_PHONE: "087 361 1407",
  SENDER_NAME: "Cllr Noel Connolly",
  SHEET_ID: "",                         // filled in automatically by setup()
  PRIVACY_URL: "https://noelconnolly.ie/privacy.html",
  RETENTION_DAYS: "30",                 // Sheet rows and sent copies older than this are deleted daily
  PURGE_INBOX_COPIES: "false",          // "true" also trashes form emails in this account's inbox after RETENTION_DAYS
                                        // (only when TEAM_EMAIL is this account and the CRM has imported them)
};

var CATEGORIES = [
  "Housing Query", "Planning Query", "Road Repair Query", "Peace Commissioner Query",
  "Medical Card Query", "Health Query", "Business Query", "Community Support Query",
  "Education Query", "Childcare Query", "Home Help/Carers Query", "Infrastructure Query",
  "Disability Query", "Council Grants Query", "Other Query", "Irish Language Query", "Campaign Query",
];
var NATURES = [
  "Request for help", "Information or advice", "Report a problem", "Follow-up on an existing query",
  "Complaint", "Invitation or event", "Feedback or suggestion",
];
var CONTACT_METHODS = ["Email", "Phone call", "Text message"];

var SHEET_HEADERS = [
  "Received", "Reference", "Category", "Nature of request", "Area", "First name", "Last name",
  "Email", "Phone", "Preferred contact", "Description", "Consent", "Searched for",
  "Team email sent", "Confirmation sent", "Source page", "CRM status", "CRM case ref",
];

function setting(name) {
  var v = PropertiesService.getScriptProperties().getProperty(name);
  return v !== null && v !== "" ? v : DEFAULTS[name];
}

// ----- Web app entry points ---------------------------------------------------

function doGet() {
  return json({ ok: true, service: "noelconnolly.ie contact form", quota: MailApp.getRemainingDailyQuota() });
}

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Spam: the hidden "website" field, or filled in faster than a person could.
  if ((p.website || "").trim() || Number(p.elapsed_ms || 0) < 3000) {
    return json({ ok: true, ref: makeRef() });
  }

  var v = clean(p);
  var problem = check(v);
  if (problem) return json({ ok: false, error: problem });

  // At most 5 messages an hour from one email address or phone number.
  var cache = CacheService.getScriptCache();
  var who = "rate:" + (v.email || v.phone).toLowerCase();
  var count = Number(cache.get(who) || 0);
  if (count >= 5) return json({ ok: false, error: "Too many messages in a short time. Please phone " + setting("OFFICE_PHONE") + "." });
  cache.put(who, String(count + 1), 3600);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ref = makeRef();
    var received = new Date();
    var teamSent = false, ackSent = false;

    // Keep one email in reserve so the team message is never the one that fails.
    var quota = MailApp.getRemainingDailyQuota();
    if (quota >= 1) {
      var mail = teamEmail(v, ref, received);
      MailApp.sendEmail({
        to: setting("TEAM_EMAIL"),
        replyTo: v.email || setting("TEAM_EMAIL"),
        name: "noelconnolly.ie contact form",
        subject: mail.subject,
        body: mail.body,
        htmlBody: mail.html,
      });
      teamSent = true;
    }
    if (v.email && setting("SEND_AUTO_REPLY") === "true" && MailApp.getRemainingDailyQuota() >= 1) {
      var ack = confirmationEmail(v, ref);
      MailApp.sendEmail({
        to: v.email,
        replyTo: setting("TEAM_EMAIL"),
        name: setting("SENDER_NAME"),
        subject: ack.subject,
        body: ack.body,
        htmlBody: ack.html,
      });
      ackSent = true;
    }

    sheet().appendRow([
      received, ref, v.category, v.nature, cell(v.area), cell(v.first_name), cell(v.last_name),
      cell(v.email), v.phone ? "'" + v.phone : "", v.contact_method, cell(v.description), v.consent, cell(v.search_text),
      teamSent ? "Yes" : "No (daily email limit reached)", ackSent ? "Yes" : "No", cell(v.page), "New", "",
    ]);

    return json({ ok: true, ref: ref });
  } finally {
    lock.releaseLock();
  }
}

// ----- Validation ---------------------------------------------------------------

function clean(p) {
  function s(name, max) { return String(p[name] || "").replace(/\r\n?/g, "\n").trim().slice(0, max || 200); }
  var v = {
    category: s("category"), nature: s("nature"), area: s("area", 100),
    first_name: s("first_name", 80), last_name: s("last_name", 80),
    email: s("email", 200).toLowerCase(), phone: s("phone", 40),
    contact_method: s("contact_method"), description: s("description", 3000),
    consent: s("consent") === "Yes" ? "Yes" : "No", search_text: s("search_text", 200), page: s("page", 300),
  };
  // Anything unexpected becomes the default rather than an error.
  if (CATEGORIES.indexOf(v.category) < 0) v.category = "Other Query";
  if (NATURES.indexOf(v.nature) < 0) v.nature = "Request for help";
  if (CONTACT_METHODS.indexOf(v.contact_method) < 0) v.contact_method = v.email ? "Email" : "Phone call";
  // Square brackets would confuse the subject line format.
  v.area = v.area.replace(/[\[\]]/g, "");
  return v;
}

function check(v) {
  if (!v.first_name || !v.last_name) return "Please enter your name.";
  if (!v.area) return "Please enter your area.";
  if (v.description.length < 10) return "Please describe your query.";
  if (!v.email && !v.phone) return "Please give an email address or phone number.";
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return "That email address doesn't look right.";
  if (v.consent !== "Yes") return "Please confirm we can use your details.";
  return null;
}

// ----- Emails ---------------------------------------------------------------------

/**
 * The team email. The subject and the "Key: value" lines are a fixed format
 * that the CRM reads; its parser is src/lib/mail/website-form.ts in the CRM, so change both together.
 */
function teamEmail(v, ref, received) {
  var name = v.first_name + " " + v.last_name;
  var when = Utilities.formatDate(received, "Europe/Dublin", "dd/MM/yyyy HH:mm");
  var subject = "[Website] [" + v.category + "] [" + v.nature + "] [" + v.area + "] " + name;
  var fields = [
    ["Reference", ref], ["Received", when], ["Category", v.category], ["Nature of request", v.nature],
    ["Area", v.area], ["Name", name], ["First name", v.first_name], ["Last name", v.last_name],
    ["Email", v.email], ["Phone", v.phone], ["Preferred contact", v.contact_method],
    ["Consent", v.consent], ["Searched for", v.search_text],
  ];
  var body = ["NOELCONNOLLY.IE CONTACT FORM"]
    .concat(fields.map(function (f) { return f[0] + ": " + f[1]; }))
    .concat(["--- Description ---", v.description, "--- End ---"]).join("\n");

  var rows = fields.map(function (f) {
    return '<tr><td style="padding:6px 12px;background:#f2f8f4;font-weight:600;color:#06321f;white-space:nowrap;border-bottom:1px solid #e3e9e5">' +
      esc(f[0]) + '</td><td style="padding:6px 12px;border-bottom:1px solid #e3e9e5">' + esc(f[1] || "–") + "</td></tr>";
  }).join("");
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#17211c;max-width:680px">' +
    '<div style="background:#0d5c39;color:#fff;padding:14px 18px;border-radius:8px 8px 0 0">' +
    '<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">NOELCONNOLLY.IE CONTACT FORM</div>' +
    '<div style="font-size:18px;font-weight:bold;margin-top:4px">' + esc(v.category) + " · " + esc(v.area) + "</div></div>" +
    '<table style="border-collapse:collapse;width:100%;border:1px solid #e3e9e5">' + rows + "</table>" +
    '<h3 style="margin:18px 0 6px;color:#06321f">Description</h3>' +
    '<div style="white-space:pre-wrap;border-left:4px solid #e8b931;padding:8px 12px;background:#fffdf5">' + esc(v.description) + "</div>" +
    '<p style="color:#4a5750;font-size:12px;margin-top:18px">Reply to this email to answer ' + esc(v.first_name) +
    (v.email ? " at " + esc(v.email) : "") + ". Preferred contact: " + esc(v.contact_method) + (v.phone ? ", " + esc(v.phone) : "") + ".</p></div>";
  return { subject: subject, body: body, html: html };
}

/**
 * The confirmation sent to the person who wrote in, in English and Irish.
 * The Irish has NOT been checked by a fluent speaker yet: please have it
 * checked before going live.
 */
function confirmationEmail(v, ref) {
  var phone = setting("OFFICE_PHONE");
  var subject = "We've received your message / Fuarthas do theachtaireacht (" + ref + ")";
  var en = [
    "Dear " + v.first_name + ",",
    "",
    "Thank you for contacting Cllr Noel Connolly. This is an automatic confirmation that your message has been received.",
    "",
    "Your reference: " + ref,
    "Topic: " + v.category,
    "",
    "We aim to respond within about 2 working days, although this may vary depending on capacity and the volume of queries we receive.",
    "",
    "If your matter is urgent, please phone the office on " + phone + ". You can reply to this email if you need to add anything.",
    "",
    "Kind regards,",
    "The office of Cllr Noel Connolly",
    "4 Market Square, Kildare, R51 X458",
    "",
    "How we use your information: " + setting("PRIVACY_URL"),
  ];
  var ga = [
    "A chara,",
    "",
    "Go raibh maith agat as teagmháil a dhéanamh leis an gComhairleoir Noel Connolly. Is dearbhú uathoibríoch é seo go bhfuarthas do theachtaireacht.",
    "",
    "D'uimhir thagartha: " + ref,
    "Ábhar: " + v.category,
    "",
    "Tá sé mar aidhm againn freagra a thabhairt ort laistigh de thart ar 2 lá oibre, cé go bhféadfadh sé sin athrú ag brath ar ár gcumas agus ar líon na bhfiosrúchán a fhaighimid.",
    "",
    "Más ábhar práinneach é, cuir glao ar an oifig ar " + phone + ". Is féidir leat freagra a thabhairt ar an ríomhphost seo más mian leat aon rud a chur leis.",
    "",
    "Le meas,",
    "Oifig an Chomhairleora Noel Connolly",
    "4 Cearnóg an Mhargaidh, Cill Dara, R51 X458",
    "",
    "Conas a úsáidimid d'fhaisnéis: " + setting("PRIVACY_URL"),
  ];
  var body = en.join("\n") + "\n\n----------------------------------------\n\n" + ga.join("\n");

  function para(lines) {
    return lines.join("\n").split("\n\n").map(function (p) {
      return '<p style="margin:0 0 12px">' + esc(p).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#17211c;max-width:620px">' +
    '<div style="background:#0d5c39;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:bold">Cllr Noel Connolly</div>' +
    '<div style="border:1px solid #e3e9e5;border-top:0;padding:20px;border-radius:0 0 8px 8px">' +
    para(en) +
    '<hr style="border:0;border-top:1px solid #e3e9e5;margin:20px 0">' +
    '<div lang="ga">' + para(ga) + "</div>" +
    "</div></div>";
  return { subject: subject, body: body, html: html };
}

// ----- Sheet ------------------------------------------------------------------------

function sheet() {
  var id = setting("SHEET_ID");
  var ss = id ? SpreadsheetApp.openById(id) : null;
  if (!ss) {
    ss = SpreadsheetApp.create("noelconnolly.ie contact form submissions");
    PropertiesService.getScriptProperties().setProperty("SHEET_ID", ss.getId());
  }
  var sh = ss.getSheetByName("Submissions") || ss.getSheets()[0];
  if (sh.getName() !== "Submissions") sh.setName("Submissions");
  if (sh.getLastRow() === 0) {
    sh.appendRow(SHEET_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight("bold").setBackground("#e3f1e9");
  }
  return sh;
}

// ----- Retention ---------------------------------------------------------------------

/**
 * Runs daily (installed by setup). The Sheet and these emails are only copies
 * made while delivering a message; the casework system keeps the real record.
 * Deletes Sheet rows, and moves this account's sent copies to the Bin (Gmail
 * empties it after 30 days), once they are older than RETENTION_DAYS.
 */
function retentionCleanup() {
  var days = Number(setting("RETENTION_DAYS")) || 30;
  var cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);

  var sh = sheet();
  var last = sh.getLastRow();
  if (last > 1) {
    var received = sh.getRange(2, 1, last - 1, 1).getValues();
    // Rows are in date order, so delete from the bottom of the old block upwards.
    for (var r = received.length - 1; r >= 0; r--) {
      var d = received[r][0];
      if (d instanceof Date && d < cutoff) sh.deleteRow(r + 2);
    }
  }

  var queries = ['in:sent subject:("[Website]" OR "Fuarthas do theachtaireacht") older_than:' + days + "d"];
  if (setting("PURGE_INBOX_COPIES") === "true") {
    queries.push('in:inbox from:me subject:"[Website]" older_than:' + days + "d");
  }
  queries.forEach(function (q) {
    var threads;
    do {
      threads = GmailApp.search(q, 0, 100);
      if (threads.length) GmailApp.moveThreadsToTrash(threads);
    } while (threads.length === 100);
  });
}

// ----- Helpers -----------------------------------------------------------------------

function makeRef() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", tail = "";
  for (var i = 0; i < 4; i++) tail += chars.charAt(Math.floor(Math.random() * chars.length));
  return "WEB-" + Utilities.formatDate(new Date(), "Europe/Dublin", "yyyyMMdd") + "-" + tail;
}

// Stops text typed into the form being treated as a spreadsheet formula.
function cell(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ----- Run these by hand from the editor ----------------------------------------------

/** Run once after pasting the script in: creates the Sheet, installs the daily clean-up and asks for permissions. */
function setup() {
  var sh = sheet();
  Logger.log("Sheet ready: " + sh.getParent().getUrl());
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "retentionCleanup") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("retentionCleanup").timeBased().everyDays(1).atHour(3).create();
  Logger.log("Daily clean-up installed: copies older than " + setting("RETENTION_DAYS") + " days are deleted.");
  Logger.log("Emails left today: " + MailApp.getRemainingDailyQuota());
}

/** Sends a test message through the whole flow, to TEAM_EMAIL only. */
function sendTest() {
  var res = doPost({ parameter: {
    category: "Road Repair Query", nature: "Report a problem", area: "Kildare Town",
    first_name: "Test", last_name: "Person", email: Session.getActiveUser().getEmail() || setting("TEAM_EMAIL"),
    phone: "087 000 0000", contact_method: "Email", consent: "Yes", elapsed_ms: "10000",
    description: "This is a test message from sendTest() in the Apps Script editor.", search_text: "pothole",
    page: "apps-script-test",
  } });
  Logger.log(res.getContent());
}
