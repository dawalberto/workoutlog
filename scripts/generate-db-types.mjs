import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const outputPath = new URL('../src/types/database.types.ts', import.meta.url);
const result = spawnSync('supabase', ['gen', 'types', 'typescript', '--local'], {
  encoding: 'utf8',
});

if (result.error) {
  console.error(`Failed to run Supabase CLI: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const normalized = result.stdout
  .replace(/\r\n?/g, '\n')
  .split('\n')
  .map((line) => line.trimEnd())
  .join('\n')
  .replace(/\n*$/, '\n');

await writeFile(outputPath, normalized);
