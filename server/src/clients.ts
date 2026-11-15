// The client logos of the "Trusted by" band on the home page (files in web/public/media/clients, made from the client's
// LOGOS folder, Nov 2026). Called by db:content. Safe to run again: it adds only the names that are not there yet, and
// removes the "[Client n]" samples from db:seed.
//   dark = the file for the dark theme. Empty: the site turns the light logo white by itself (fine for one-colour logos).
import { q } from './db';
import { env } from './env';

const M = env.MEDIA_URL + '/media/clients/'; // on R2 (npm run media:upload), or web/public locally
export const CLIENTS: { name: string; light: string; dark?: string }[] = [
  { name: 'Zafeer', light: 'zafeer' },
  { name: 'Ahmed Marei Auto Trade', light: 'ahmed-marei-auto-trade' },
  { name: 'Ahmed Marei Nissan', light: 'ahmed-marei-nissan' },
  { name: 'Mashwiyat El Qalaa', light: 'mashwiyat-el-qalaa' },
  { name: 'Lail Cafe & Restaurant', light: 'lail', dark: 'lail' },
  { name: 'Santorini Cafe & Restaurant', light: 'santorini', dark: 'santorini' },
  { name: 'Ebru', light: 'ebru', dark: 'ebru-dark' },
  { name: "Charro's Butchery & Steakhouse", light: 'charros' },
  { name: 'El Hag Anwar Masoud', light: 'el-hag-anwar-masoud', dark: 'el-hag-anwar-masoud' },
  { name: 'Safari Kids Area', light: 'safari-kids-area', dark: 'safari-kids-area' },
  { name: 'Sky Boo Cafe & Restaurant', light: 'skyboo', dark: 'skyboo-dark' },
  { name: 'Old Street Cafe & Restaurant', light: 'old-street' },
];

export async function seedClients() {
  await q("DELETE FROM clients WHERE name LIKE '[%'");
  let added = 0;
  for (const [i, c] of CLIENTS.entries()) {
    const r = await q(
      `INSERT INTO clients (name, logo_light_url, logo_dark_url, sort, active)
       SELECT $1, $2, $3, $4, true WHERE NOT EXISTS (SELECT 1 FROM clients WHERE name = $1) RETURNING id`,
      [c.name, M + c.light + '.webp', c.dark ? M + c.dark + '.webp' : '', i]
    );
    added += r.length;
  }
  console.log(`clients: ${added} logos added (${CLIENTS.length} in the list)`);
}
