// Generates the Supabase Auth email templates in supabase/templates/ from one
// layout, styled like the landing page (dark hero, teal accent, Baloo 2 wordmark).
//
//   node scripts/build-email-templates.mjs
//
// Then paste each file into Supabase Dashboard → Authentication → Email Templates
// (both projects). {{ .ConfirmationURL }} etc. are Supabase template variables.
import { mkdirSync, writeFileSync } from "node:fs";

const LOGO_URL = "https://thelagoonproject.com/images/email-logo.png";
const SITE_URL = "https://thelagoonproject.com";

const TEMPLATES = [
  {
    file: "confirmation.html",
    subject: "Conferma il tuo account Lagoon",
    preheader: "Un ultimo passo per iniziare a usare Lagoon.",
    title: "Benvenuto in Lagoon",
    body: "Grazie per esserti registrato. Conferma il tuo indirizzo email per attivare l'account e iniziare a prenotare depositi bagagli, docce, spazi per lavorare e riposare in città.",
    cta: "Conferma email",
  },
  {
    file: "recovery.html",
    subject: "Reimposta la tua password Lagoon",
    preheader: "Hai chiesto di reimpostare la password.",
    title: "Reimposta la password",
    body: "Abbiamo ricevuto una richiesta di reimpostazione della password per il tuo account. Tocca il pulsante dal telefono: si aprirà l'app e potrai sceglierne una nuova.",
    cta: "Scegli una nuova password",
  },
  {
    file: "email_change.html",
    subject: "Conferma il nuovo indirizzo email",
    preheader: "Conferma il cambio di email del tuo account Lagoon.",
    title: "Conferma il nuovo indirizzo",
    body: "Hai chiesto di cambiare l'email del tuo account da <strong>{{ .Email }}</strong> a <strong>{{ .NewEmail }}</strong>. Conferma per completare la modifica.",
    cta: "Conferma nuova email",
  },
];

const FONT_DISPLAY = "'Baloo 2','Arial Rounded MT Bold',Arial,sans-serif";
const FONT_BODY = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

const layout = (t) => `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${t.subject}</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#F0F6F6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${t.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6F6;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;border-radius:20px;overflow:hidden;background:#FFFFFF;">
      <tr><td align="center" style="background:#040C0C;background-image:radial-gradient(ellipse 80% 70% at 50% 0%,rgba(79,155,155,0.35) 0%,rgba(4,12,12,0) 70%);padding:40px 24px 32px;">
        <img src="${LOGO_URL}" width="56" height="56" alt="Lagoon" style="display:block;border:0;border-radius:14px;margin:0 auto 14px;">
        <div style="font-family:${FONT_DISPLAY};font-size:32px;font-weight:800;letter-spacing:-0.5px;line-height:1;color:#F2EDE4;">Lagoon</div>
        <div style="font-family:${FONT_DISPLAY};font-size:15px;font-weight:700;color:rgba(255,255,255,0.6);margin-top:8px;">Your city, shared.</div>
      </td></tr>
      <tr><td style="padding:36px 32px 12px;font-family:${FONT_BODY};color:#0A1A1A;">
        <h1 style="margin:0 0 14px;font-family:${FONT_DISPLAY};font-size:24px;font-weight:800;color:#0F4E4E;">${t.title}</h1>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#2B4545;">${t.body}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr><td align="center" style="border-radius:99px;background:#4F9B9B;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;font-family:${FONT_BODY};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:99px;">${t.cta}</a>
          </td></tr>
        </table>
        <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#5C7575;">Apri questa email dal telefono su cui hai installato Lagoon. Se non sei stato tu a fare questa richiesta, puoi ignorare il messaggio.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 32px;font-family:${FONT_BODY};">
        <div style="border-top:1px solid #E2EEEE;padding-top:18px;font-size:12px;line-height:1.6;color:#7A9090;text-align:center;">
          Lagoon · <a href="${SITE_URL}" style="color:#4F9B9B;text-decoration:none;">thelagoonproject.com</a>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;

mkdirSync("supabase/templates", { recursive: true });
for (const t of TEMPLATES) {
  writeFileSync(`supabase/templates/${t.file}`, layout(t));
  console.log(`supabase/templates/${t.file}  —  subject: ${t.subject}`);
}
