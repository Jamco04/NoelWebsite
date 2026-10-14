// Site settings. This is the only file that needs editing to switch the contact
// form on. See SETUP.md, step 1.
window.SITE_CONFIG = {
  // Where the form sends to: the Constituency CRM's website-form address. The CRM
  // stores the query as a case and sends the person its own confirmation, so
  // nothing else is sent from here. It only accepts the origins listed in CRM
  // Settings > Email & automation (noelconnolly.ie and www.noelconnolly.ie).
  // The fallback is the Google Apps Script web app URL (ends in /exec), see
  // SETUP.md. Either replies with JSON {ok, ref} or {ok: false, error}. Anything
  // that isn't an https address puts the form in preview mode: nothing is sent.
  FORM_ENDPOINT: "https://constituency-crm.vercel.app/api/public/website-form",

  // Shown if sending fails, so nobody is left without a way to get in touch.
  FALLBACK_EMAIL: "mail@noelconnolly.ie",
  OFFICE_PHONE: "087 361 1407",
};
