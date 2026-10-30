import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalSkillKey } from '../skill-usage.mjs';

test('portable skill names and numbered directories resolve without guessing ambiguous names', () => {
  const skills = ['89-ui-facelift', '90-rag-engineering'];
  assert.equal(canonicalSkillKey('dev-team-kit-fv:ui-facelift', skills), '89-ui-facelift');
  assert.equal(canonicalSkillKey('90-rag-engineering', skills), '90-rag-engineering');
  assert.equal(canonicalSkillKey('outside', skills), 'outside');
  assert.equal(canonicalSkillKey('foo', ['01-foo', '02-foo']), 'foo');
});
