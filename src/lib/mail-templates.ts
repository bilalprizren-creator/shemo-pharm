import "server-only";
import { SITE } from "@/lib/site";
import { fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { MailMessage } from "@/lib/mail";

/**
 * The message bodies. Pure functions — no I/O, no provider knowledge.
 *
 * HTML is table-based with inline styles only: mail clients strip <style>
 * blocks, ignore external CSS and block remote images, so the wordmark is
 * styled text rather than a logo file. Every message also carries a hand-
 * written plain-text version — that is what a text-only client renders, and
 * what gets logged locally while no API key is configured.
 */

const BRAND = "#834b9b";
const INK = "#2c2c30";
const MUTED = "#6b6b73";
const LINE = "#e8e4ee";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(title: string, bodyHtml: string, footerNote: string): string {
  return `<!doctype html>
<html lang="sq">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f4f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="background:${BRAND};padding:20px 28px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:0.5px;">SHEMO PHARM</span>
        </td></tr>
        <tr><td style="padding:28px;color:${INK};font-size:15px;line-height:1.6;">
${bodyHtml}
        </td></tr>
        <tr><td style="border-top:1px solid ${LINE};padding:18px 28px;color:${MUTED};font-size:12px;line-height:1.6;">
          ${escapeHtml(footerNote)}<br>
          ${escapeHtml(SITE.phones[0].label)} &middot; ${escapeHtml(SITE.emails[0])}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
  <tr><td style="background:${BRAND};border-radius:999px;">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;">${escapeHtml(text)}</p>`;
}

/** "Confirm this mailbox is yours" — sent on registration and on resend. */
export function verifyEmailMessage({
  dict,
  name,
  to,
  url,
}: {
  dict: Dictionary;
  name: string;
  to: string;
  url: string;
}): MailMessage {
  const m = dict.mail;
  const intro = fmt(m.verifyIntro, { name });

  const html = shell(
    m.verifySubject,
    [
      `<h1 style="margin:0 0 14px;font-size:20px;color:${INK};">${escapeHtml(m.verifyHeading)}</h1>`,
      paragraph(intro),
      paragraph(m.verifyBody),
      button(url, m.verifyButton),
      `<p style="margin:0 0 6px;color:${MUTED};font-size:13px;">${escapeHtml(m.verifyFallback)}</p>`,
      `<p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:${BRAND};">${escapeHtml(url)}</a></p>`,
      `<p style="margin:0;color:${MUTED};font-size:13px;">${escapeHtml(m.verifyExpiry)} ${escapeHtml(m.verifyIgnore)}</p>`,
    ].join("\n"),
    m.footerNote
  );

  const text = [
    m.verifyHeading,
    "",
    intro,
    m.verifyBody,
    "",
    url,
    "",
    m.verifyExpiry,
    m.verifyIgnore,
    "",
    m.footerNote,
  ].join("\n");

  return { to, subject: m.verifySubject, html, text };
}

/**
 * "A new partner registered" — to the business. Albanian only and hardcoded,
 * matching /admin/kerkesat, which is not internationalized either.
 */
export function newRegistrationMessage({
  user,
  to,
  adminUrl,
}: {
  user: { name: string; company: string; phone: string; email: string };
  to: string;
  adminUrl: string;
}): MailMessage {
  const subject = `Regjistrim i ri B2B: ${user.name}`;
  const rows: [string, string][] = [
    ["Emri", user.name],
    ["Kompania", user.company || "—"],
    ["Telefoni", user.phone],
    ["Email", user.email],
  ];

  const html = shell(
    subject,
    [
      `<h1 style="margin:0 0 14px;font-size:20px;color:${INK};">Regjistrim i ri</h1>`,
      paragraph("Një klient i ri ka krijuar llogari dhe pret aprovim."),
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">`,
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:${MUTED};">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(v)}</td></tr>`
        )
        .join("\n"),
      `</table>`,
      button(adminUrl, "Hap kërkesat"),
    ].join("\n"),
    "Njoftim automatik nga uebfaqja e SHEMO PHARM."
  );

  const text = [
    "Regjistrim i ri B2B",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    adminUrl,
  ].join("\n");

  // So a reply from the admin's inbox reaches the customer directly.
  return { to, subject, html, text, replyTo: user.email };
}

/**
 * "Someone wrote through the contact form" — to the business.
 *
 * Albanian only and hardcoded, like the registration notice: it goes to the
 * same inbox and pairs with /admin/mesazhet, which is not translated either.
 * The message is quoted in full so the notification stands on its own — an
 * inquiry that can only be read by logging into an admin panel is an inquiry
 * that waits.
 */
export function newContactMessage({
  entry,
  to,
  adminUrl,
}: {
  entry: {
    name: string;
    company: string;
    phone: string;
    email: string;
    subject: string;
    message: string;
  };
  to: string;
  adminUrl: string;
}): MailMessage {
  const subject = `Mesazh i ri nga faqja: ${entry.subject}`;
  const rows: [string, string][] = [
    ["Emri", entry.name],
    ["Kompania", entry.company || "—"],
    ["Telefoni", entry.phone],
    ["Email", entry.email],
  ];

  const html = shell(
    subject,
    [
      `<h1 style="margin:0 0 14px;font-size:20px;color:${INK};">Mesazh i ri</h1>`,
      paragraph(entry.subject),
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">`,
      rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:${MUTED};">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(v)}</td></tr>`
        )
        .join("\n"),
      `</table>`,
      // white-space:pre-wrap keeps the writer's own line breaks; without it a
      // paragraphed message arrives as one block of text.
      `<div style="margin:18px 0;padding:14px 16px;border-left:3px solid ${BRAND};background:#faf8fc;white-space:pre-wrap;font-size:14px;line-height:1.6;">${escapeHtml(
        entry.message
      )}</div>`,
      button(adminUrl, "Hap mesazhet"),
    ].join("\n"),
    "Njoftim automatik nga uebfaqja e SHEMO PHARM."
  );

  const text = [
    "Mesazh i ri nga formulari i kontaktit",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `Subjekti: ${entry.subject}`,
    "",
    entry.message,
    "",
    adminUrl,
  ].join("\n");

  // Reply goes to the person who wrote, not into the void.
  return { to, subject, html, text, replyTo: entry.email };
}

/**
 * "Choose a new password" — the only way back into an account whose password
 * is lost. Names no account details beyond the greeting: the mail may land in
 * a shared pharmacy mailbox, and it is also what someone typing a stranger's
 * address into the form would receive.
 */
export function resetPasswordMessage({
  dict,
  name,
  to,
  url,
}: {
  dict: Dictionary;
  name: string;
  to: string;
  url: string;
}): MailMessage {
  const m = dict.mail;
  const intro = fmt(m.resetIntro, { name });

  const html = shell(
    m.resetSubject,
    [
      `<h1 style="margin:0 0 14px;font-size:20px;color:${INK};">${escapeHtml(m.resetHeading)}</h1>`,
      paragraph(intro),
      paragraph(m.resetBody),
      button(url, m.resetButton),
      `<p style="margin:0 0 6px;color:${MUTED};font-size:13px;">${escapeHtml(m.verifyFallback)}</p>`,
      `<p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:${BRAND};">${escapeHtml(url)}</a></p>`,
      `<p style="margin:0;color:${MUTED};font-size:13px;">${escapeHtml(m.resetExpiry)} ${escapeHtml(m.resetIgnore)}</p>`,
    ].join("\n"),
    m.footerNote
  );

  const text = [
    m.resetHeading,
    "",
    intro,
    m.resetBody,
    "",
    url,
    "",
    m.resetExpiry,
    m.resetIgnore,
    "",
    m.footerNote,
  ].join("\n");

  return { to, subject: m.resetSubject, html, text };
}

/** "Your account is approved" — sent when the admin flips status to approved. */
export function accountApprovedMessage({
  dict,
  name,
  to,
  url,
}: {
  dict: Dictionary;
  name: string;
  to: string;
  url: string;
}): MailMessage {
  const m = dict.mail;
  const intro = fmt(m.approvedIntro, { name });

  const html = shell(
    m.approvedSubject,
    [
      `<h1 style="margin:0 0 14px;font-size:20px;color:${INK};">${escapeHtml(m.approvedHeading)}</h1>`,
      paragraph(intro),
      paragraph(m.approvedBody),
      button(url, m.approvedButton),
    ].join("\n"),
    m.footerNote
  );

  const text = [
    m.approvedHeading,
    "",
    intro,
    m.approvedBody,
    "",
    url,
    "",
    m.footerNote,
  ].join("\n");

  return { to, subject: m.approvedSubject, html, text };
}
