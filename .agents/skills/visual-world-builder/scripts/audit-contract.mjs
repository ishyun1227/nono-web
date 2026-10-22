#!/usr/bin/env node
// Static theme-contract audit: catches planned duplicate feature locations.
// Does NOT inspect the rendered website or replace interaction tests.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function auditContract(contract) {
  const errors = [];
  const isText = value => typeof value === 'string' && value.trim().length > 0;
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    return ['Theme contract must be an object'];
  }
  if (!isText(contract.themeId)) errors.push('themeId is required');
  if (!['color','premium'].includes(contract.tier)) errors.push('tier must be color or premium');
  if (!isText(contract.referenceSummary)) errors.push('referenceSummary is required');
  const actions = contract.primaryActions;
  if (!Array.isArray(actions) || !actions.length) errors.push('primaryActions must be a nonempty array');
  const ids = new Set();
  const surfaces = new Set();
  for (const [i, action] of (Array.isArray(actions) ? actions : []).entries()) {
    if (!action || !isText(action.id) || !isText(action.surface) || !isText(action.handler)) {
      errors.push('primaryActions[' + i + '] must provide id, surface, handler');
      continue;
    }
    if (ids.has(action.id)) errors.push('Duplicate primary action: ' + action.id);
    if (surfaces.has(action.surface)) errors.push('Multiple primary actions assigned to one surface: ' + action.surface);
    ids.add(action.id);
    surfaces.add(action.surface);
  }
  for (const [i, trigger] of (contract.additionalTriggers || []).entries()) {
    if (!trigger || !ids.has(trigger.forAction)) errors.push('additionalTriggers[' + i + '] references unknown action');
    if (!trigger || !isText(trigger.surface)) errors.push('additionalTriggers[' + i + '] missing surface');
    if (trigger && !trigger.userApproved) errors.push('additionalTriggers[' + i + '] requires userApproved=true');
    if (trigger && !isText(trigger.justification)) errors.push('additionalTriggers[' + i + '] needs justification');
    if (trigger && surfaces.has(trigger.surface)) errors.push('additionalTriggers[' + i + '] overlaps a primary surface');
  }
  const decorations = contract.decorations || [];
  if (!Array.isArray(decorations)) errors.push('decorations must be array');
  else for (const [i, decoration] of decorations.entries()) {
    if (!decoration || !isText(decoration.surface)) { errors.push('decorations[' + i + '] missing surface'); continue; }
    if (surfaces.has(decoration.surface)) errors.push('Decorative surface also has primary action: ' + decoration.surface);
    if (!['noninteractive','easter-egg'].includes(decoration.kind)) errors.push('decorations[' + i + '] kind is invalid');
    if (decoration.kind === 'easter-egg' && decoration.changesGameState !== false) {
      errors.push('Easter egg must explicitly set changesGameState=false: ' + decoration.surface);
    }
    if (decoration.kind === 'noninteractive' && decoration.handler) errors.push('Decorative item may not have handler: ' + decoration.surface);
  }
  if (contract.noScreenshotAsInterface !== true) errors.push('noScreenshotAsInterface must be true');
  if (contract.originalGraphicsOnly !== true) errors.push('originalGraphicsOnly must be true (or use properly licensed assets after adapting the contract)');
  if (contract.tier === 'premium') {
    const required = ['desktop-render','mobile-render','active-game-render','input-regression','theme-switch','data-preservation'];
    const reviews = new Set(contract.requiredReviews || []);
    for (const review of required) if (!reviews.has(review)) errors.push('Missing premium review: ' + review);
  }
  return errors;
}

const invokedAsScript = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedAsScript) {
  if (!process.argv[2]) {
    console.error('Usage: node audit-contract.mjs path/to/theme-contract.json');
    process.exit(2);
  }
  try {
    const contract = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const failures = auditContract(contract);
    if (failures.length) {
      for (const failure of failures) console.error('FAIL: ' + failure);
      process.exitCode = 1;
    } else {
      console.log('PASS: theme contract has no documented duplicate actions or invalid decorations.');
      console.log('REMINDER: runtime and visual audits are still required.');
    }
  } catch (error) {
    console.error('Cannot audit contract: ' + error.message);
    process.exitCode = 2;
  }
}
