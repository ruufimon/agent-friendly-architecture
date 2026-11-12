// Rule 2: forbidden imports fail mechanically, and the message names the supported path.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';

const root = 'src/app';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const path = join(dir, d.name);
    return d.isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** 'features/<name>', 'bank', 'dune' or 'app' for anything else under src/app. */
function area(path) {
  const parts = relative(root, path).split(sep);
  if (parts[0] === 'features' && parts.length > 2) return `features/${parts[1]}`;
  if (parts[0] === 'bank' || parts[0] === 'dune') return parts[0];
  return parts[0].startsWith('..') ? 'outside' : 'app';
}

const importPattern = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const failures = [];

for (const file of walk(root)) {
  if (file.endsWith('features.generated.ts')) continue;
  const from = area(file);
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const spec = match[1] ?? match[2];
    const fail = (supportedPath) => failures.push(`✗ ${file} imports '${spec}'.\n  → ${supportedPath}`);

    if (from.startsWith('features/') && spec.startsWith('@angular/common/http')) {
      fail('Features never call HTTP directly. Use BankHost (src/app/bank/bank-host.ts), the one typed contract.');
      continue;
    }
    if (!spec.startsWith('.')) continue;

    const to = area(normalize(join(dirname(file), spec)));
    if (from.startsWith('features/') && to.startsWith('features/') && to !== from) {
      fail('Features never import each other. Share state through BankClient commands and server calls through BankHost.');
    } else if (from.startsWith('features/') && to === 'app') {
      fail('Features never import the app shell. Use src/app/dune and src/app/bank only.');
    } else if (from === 'dune' && to !== 'dune') {
      fail('The framework never imports application code. Move app types to src/app/bank or a feature.');
    } else if (from === 'bank' && to !== 'bank') {
      fail('src/app/bank holds shared contracts only. It may not import features or the shell.');
    }
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.join('\n\n')}\n\n(See AGENTS.md, rule 2.)\n`);
  process.exit(1);
}
console.log('Boundaries OK');
