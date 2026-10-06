import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from './check-rules.ts';

const args = process.argv.slice(2);
const draft = args.includes('--draft');
const i = args.indexOf('--chat-repo');
const chatRepo = (i >= 0 ? args[i + 1] : undefined) ?? process.env.CHAT_REPO ?? undefined;
if (i >= 0 && !args[i + 1]) { console.error('--chat-repo needs a path'); process.exit(2); }

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { errors, warnings, ok } = await checkSite(resolve(root, '_site'), { draft, chatRepo: chatRepo || undefined });
for (const line of ok) console.log(line);
for (const w of warnings) console.log(`warn ${w}`);
for (const e of errors) console.error(`error ${e}`);
console.log(errors.length ? `\ncheck failed: ${errors.length} error(s), ${warnings.length} warning(s)` : `\ncheck passed (${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
