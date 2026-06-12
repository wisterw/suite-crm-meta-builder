#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.error('Usage: UpsertCustomFields <STATE> <input.csv> <configDir>');
  process.exit(1);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitCSVLine(line) {
  // Split on commas not inside quotes
  return line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(s => {
    s = s.trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
    return s;
  });
}

function mapSqlType(fieldtype, fieldlen) {
  const t = (fieldtype || '').toLowerCase();
  if (t === 'varchar') return `VARCHAR(${fieldlen || 255})`;
  if (t === 'text') return 'TEXT';
  if (t === 'int' || t === 'integer') return 'INT';
  if (t === 'datetime') return 'DATETIME';
  if (t === 'date') return 'DATE';
  if (t === 'decimal') return `DECIMAL(${fieldlen || '10,2'})`;
  // default
  return `VARCHAR(${fieldlen || 255})`;
}

const args = process.argv.slice(2);
if (args.length < 3) usage();

const state = args[0].toUpperCase();
const csvPath = args[1];
const configDir = args[2];

if (!fs.existsSync(csvPath)) {
  console.error('CSV input file not found:', csvPath);
  process.exit(2);
}

const phpFile = path.join(configDir, 'config.php');
const sqlFile = path.join(configDir, 'config.sql');

const csv = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
if (csv.length === 0) {
  console.error('CSV file is empty');
  process.exit(3);
}

const headers = splitCSVLine(csv[0]).map(h => h.toLowerCase());
const idx = name => {
  const i = headers.indexOf(name);
  if (i === -1) {
    console.error('Missing required header:', name);
    process.exit(4);
  }
  return i;
};

const iModule = idx('module');
const iField = idx('fieldname');
const iStates = idx('states');
const iLabel = idx('label');
const iType = idx('fieldtype');
const iLen = idx('fieldlen');
const iReq = idx('requiredtf');

let phpContent = '';
let sqlContent = '';
if (fs.existsSync(phpFile)) phpContent = fs.readFileSync(phpFile, 'utf8');
if (fs.existsSync(sqlFile)) sqlContent = fs.readFileSync(sqlFile, 'utf8');

let changes = 0;

for (let r = 1; r < csv.length; r++) {
  const cols = splitCSVLine(csv[r]);
  if (cols.length === 0) continue;
  const module = cols[iModule] || '';
  const field = cols[iField] || '';
  const statesCell = (cols[iStates] || '') + '';
  const label = cols[iLabel] || field;
  const fieldtype = cols[iType] || 'varchar';
  const fieldlen = cols[iLen] || '255';
  const requiredTF = ((cols[iReq] || '').toLowerCase() === 'true') ? 'true' : 'false';

  const states = statesCell.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!states.includes(state)) continue;

  const phpSnippet = `$dictionary['${module}']['fields']['${field}'] = array(\n` +
    `    'name' => '${field}',\n` +
    `    'vname' => '${label}',\n` +
    `    'type' => '${fieldtype}',\n` +
    `    'len' => '${fieldlen}',\n` +
    `    'required' => ${requiredTF},\n` +
    `);`;

  const sqlType = mapSqlType(fieldtype, fieldlen);
  const sqlSnippet = `ALTER TABLE ${module} ADD COLUMN ${field} ${sqlType} ${requiredTF === 'true' ? 'NOT NULL' : 'NULL'};`;

  // Replace or append in PHP
  const phpRegex = new RegExp(escapeRegExp(`$dictionary['${module}']['fields']['${field}']`) + '[\\s\\S]*?\\);', 'g');
  if (phpRegex.test(phpContent)) {
    phpContent = phpContent.replace(phpRegex, phpSnippet + '\n');
  } else {
    if (phpContent && !phpContent.endsWith('\n')) phpContent += '\n';
    phpContent += phpSnippet + '\n';
  }

  // Replace or append in SQL
  const sqlRegex = new RegExp('ALTER\\s+TABLE\\s+' + escapeRegExp(module) + '[\\s\\S]*?\\b' + escapeRegExp(field) + '\\b[\\s\\S]*?;', 'i');
  if (sqlRegex.test(sqlContent)) {
    sqlContent = sqlContent.replace(sqlRegex, sqlSnippet + '\n');
  } else {
    if (sqlContent && !sqlContent.endsWith('\n')) sqlContent += '\n';
    sqlContent += sqlSnippet + '\n';
  }

  changes++;
}

// Ensure output directory exists
try {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(phpFile, phpContent, 'utf8');
  fs.writeFileSync(sqlFile, sqlContent, 'utf8');
} catch (err) {
  console.error('Failed to write output files:', err);
  process.exit(5);
}

console.log(`Processed and upserted ${changes} field(s) for state ${state}.`);
