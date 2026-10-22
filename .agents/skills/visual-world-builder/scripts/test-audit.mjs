#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { auditContract } from './audit-contract.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const example = JSON.parse(readFileSync(resolve(here, '../assets/theme-contract.example.json'), 'utf8'));
assert.deepEqual(auditContract(example), [], 'Valid example should pass');

const duplicate = structuredClone(example);
duplicate.primaryActions.push({ ...duplicate.primaryActions[0], surface: 'sidebar.inventory' });
assert(auditContract(duplicate).some(message => message.includes('Duplicate primary action')));
assert(auditContract(duplicate).some(message => message.includes('Decorative surface also has primary action')));

const mirror = structuredClone(example);
mirror.additionalTriggers.push({ forAction:'choose-puzzle', surface:'inventory.second-chooser' });
assert(auditContract(mirror).some(message => message.includes('userApproved=true')));

const fakeEgg = structuredClone(example);
fakeEgg.decorations[1].changesGameState = true;
assert(auditContract(fakeEgg).some(message => message.includes('Easter egg')));

console.log('PASS: valid, duplicate chooser, unapproved mirror, and Easter egg cases');
