// One place that sends email. Without SMTP settings it only prints the message (so local development never emails anyone).
import nodemailer from 'nodemailer';
import { mailEnv } from '../env';

let transport: nodemailer.Transporter | null = null;

export const mailConfigured = !!mailEnv.SMTP_HOST;

export async function sendMail(to: string, subject: string, html: string, text: string, headers: Record<string, string> = {}) {
  if (!mailConfigured) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  transport ||= nodemailer.createTransport({
    host: mailEnv.SMTP_HOST,
    port: mailEnv.SMTP_PORT,
    secure: mailEnv.SMTP_PORT === 465,
    auth: mailEnv.SMTP_USER ? { user: mailEnv.SMTP_USER, pass: mailEnv.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: mailEnv.MAIL_FROM, to, subject, html, text, headers });
}
