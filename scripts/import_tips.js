#!/usr/bin/env node

/**
 * Imports advice data from advice2.csv into the Supabase table `tips`.
 *
 * Usage:
 *    node scripts/import_tips.js [--dry-run] [--truncate]
 *
 * Required environment variables:
 *    SUPABASE_URL
 *    SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY (for simple inserts)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { TextDecoder } = require('util');
let createClient;

const CSV_FILE = path.resolve(__dirname, '..', 'advice2.csv');
const CHUNK_SIZE = 100;

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
    truncate: args.has('--truncate'),
  };
}

function loadCsv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const rawBuffer = fs.readFileSync(filePath);
  const decoder = new TextDecoder('windows-1251');
  const csvText = decoder.decode(rawBuffer);

  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) {
    throw new Error('CSV does not contain any data rows.');
  }

  const [header, ...rows] = lines;
  const expectedHeader = 'time;tip';
  if (header.toLowerCase() !== expectedHeader) {
    throw new Error(
      `Unexpected CSV header. Expected "${expectedHeader}", got "${header}".`
    );
  }

  const records = rows.map((line, index) => {
    const sepIndex = line.indexOf(';');
    if (sepIndex === -1) {
      throw new Error(`Missing delimiter on data line ${index + 2}.`);
    }

    const monthStr = line.slice(0, sepIndex).trim();
    const tip = line.slice(sepIndex + 1).trim();
    const ageMonths = Number.parseInt(monthStr, 10);

    if (!Number.isInteger(ageMonths)) {
      throw new Error(
        `Invalid month value "${monthStr}" on data line ${index + 2}.`
      );
    }
    if (!tip || tip.length === 0) {
      throw new Error(`Empty tip content on data line ${index + 2}.`);
    }

    return {
      age_months: ageMonths,
      content: tip,
    };
  });

  return records;
}

async function main() {
  const { dryRun, truncate } = parseArgs();
  const records = loadCsv(CSV_FILE);

  if (dryRun) {
    console.log(
      `[dry-run] Parsed ${records.length} records. No changes sent to Supabase.`
    );
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  ({ createClient } = require('@supabase/supabase-js'));

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (truncate) {
    console.log('Removing existing rows from tips...');
    const { error: deleteError } = await supabase
      .from('tips')
      .delete()
      .neq('id', null);
    if (deleteError) {
      throw new Error(`Failed to truncate tips: ${deleteError.message}`);
    }
  }

  console.log(`Importing ${records.length} rows into tips...`);

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('tips').insert(chunk);
    if (error) {
      throw new Error(
        `Supabase insert failed for rows ${i + 1}-${i + chunk.length}: ${error.message}`
      );
    }
    console.log(`Inserted ${i + chunk.length} / ${records.length}`);
  }

  console.log('Import completed successfully.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
