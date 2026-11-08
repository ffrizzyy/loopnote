import { CONTRAST_PAIRS, contrastReport } from "../src/contrast";

const rows = contrastReport();

for (const row of rows) {
  const ratio = row.ratio.toFixed(2).padStart(6);
  const status = row.pass ? "PASS" : "FAIL";

  console.log(
    `${row.theme.padEnd(5)} ${row.fgVariable.padEnd(17)} on ${row.bgVariable.padEnd(17)} ${ratio}:1  min ${row.threshold.toFixed(1)}:1  ${status}`,
  );
}

const failures = rows.filter((row) => !row.pass);

if (failures.length > 0) {
  console.error(
    `tokens:contrast failed: ${failures.length} of ${rows.length} rows below threshold`,
  );
  process.exit(1);
}

console.log(
  `tokens:contrast passed: ${rows.length} rows for ${CONTRAST_PAIRS.length} pairs across both themes`,
);
