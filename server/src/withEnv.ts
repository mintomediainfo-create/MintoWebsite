// Runs one of the server scripts with the settings from another env file (e.g. the live database in prod.env), instead of .env:
//   npx tsx src/withEnv.ts ../prod.env src/seed.ts
// The values in that file win over .env (env.ts only fills what is not set yet). Prints which database it talks to.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const [file, script] = process.argv.slice(2);
if (!file || !script) { console.error('usage: tsx src/withEnv.ts <env file> <script>'); process.exit(1); }
for (const line of fs.readFileSync(path.resolve(file), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const host = (process.env.DATABASE_URL || '').replace(/^.*@([^/:?]+).*$/, '$1');
console.log(`database: ${host || '(none)'}`);
if (!/neon\.tech$/.test(host) && !process.argv.includes('--any')) { console.error('Not the Neon database: stopped.'); process.exit(1); }
import(pathToFileURL(path.resolve(script)).href);
