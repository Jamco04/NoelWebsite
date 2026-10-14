// Site settings. This is the only file that needs editing to switch the contact
// form on. See SETUP.md, step 1.
window.SITE_CONFIG = {
  // Where the form sends to: the CRM's website-form address (recommended, see
  // CRM-HANDOFF-PROMPT.md) or the Google Apps Script web app URL (ends in /exec).
  // Either must reply with JSON {ok, ref} or {ok: false, error}. While this still says
  // PASTE_..., the form runs in preview mode: nothing is sent, and the page shows
  // the email the team would have received.
  FORM_ENDPOINT: "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE",

  // Shown if sending fails, so nobody is left without a way to get in touch.
  FALLBACK_EMAIL: "mail@noelconnolly.ie",
  OFFICE_PHONE: "087 361 1407",
};
