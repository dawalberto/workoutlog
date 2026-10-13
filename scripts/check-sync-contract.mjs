import { execFileSync } from 'node:child_process';
import { getSyncContractSnapshot } from '../src/sync/contract.ts';

const query = `
  SELECT jsonb_build_object(
    'tables', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', table_name,
          'writableColumns', writable_columns,
          'identity', identity_columns
        )
        ORDER BY position
      )
      FROM private.sync_contract_tables
    ), '[]'::jsonb),
    'acceptedVersions', COALESCE((
      SELECT jsonb_agg(version ORDER BY version)
      FROM private.sync_contract_versions
      WHERE accepted
    ), '[]'::jsonb)
  ) AS sync_contract;
`;

let databaseContract;
try {
  const output = execFileSync(
    'supabase',
    ['db', 'query', '--local', '--output-format', 'json', query],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const rows = JSON.parse(output.trim());
  databaseContract = rows[0]?.sync_contract;
  if (!databaseContract) throw new Error('The database returned no sync contract metadata.');
} catch (error) {
  const details = error instanceof Error && 'stderr' in error
    ? String(error.stderr).trim()
    : error instanceof Error ? error.message : String(error);
  console.error(`Unable to read local sync contract metadata with Supabase CLI.\n${details}`);
  process.exitCode = 1;
}

if (databaseContract) {
  const expected = getSyncContractSnapshot();
  const problems = [];
  const acceptedVersions = databaseContract.acceptedVersions ?? [];
  if (!acceptedVersions.includes(expected.version)) {
    problems.push(
      `client version ${expected.version} is not accepted by the database (accepted: ${JSON.stringify(acceptedVersions)})`,
    );
  }

  const actualTables = databaseContract.tables ?? [];
  const expectedNames = expected.tables.map(({ name }) => name);
  const actualNames = actualTables.map(({ name }) => name);
  if (JSON.stringify(expectedNames) !== JSON.stringify(actualNames)) {
    problems.push(
      `table order/list differs\n  client:   ${JSON.stringify(expectedNames)}\n  database: ${JSON.stringify(actualNames)}`,
    );
  }

  const actualByName = new Map(actualTables.map((table) => [table.name, table]));
  for (const expectedTable of expected.tables) {
    const actualTable = actualByName.get(expectedTable.name);
    if (!actualTable) continue;
    for (const property of ['writableColumns', 'identity']) {
      if (
        JSON.stringify(expectedTable[property]) !==
        JSON.stringify(actualTable[property])
      ) {
        problems.push(
          `${expectedTable.name}.${property} differs\n  client:   ${JSON.stringify(expectedTable[property])}\n  database: ${JSON.stringify(actualTable[property])}`,
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error(`Sync contract parity check failed:\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Sync contract matches local database metadata (version ${expected.version}, ${expected.tables.length} tables).`,
    );
  }
}
