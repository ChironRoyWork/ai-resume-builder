import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInterviewResumeText } from '../src/utils/interviewResumeContext.js';

test('copies structured sections and generated bullets under the selected original job index', () => {
  const profile = {
    name: 'Example Candidate', skills: 'Legacy skills', experience: 'Legacy experience',
    skill_groups: [{ category: 'Languages', items: 'JavaScript' }],
    education: [{ school: 'Example University', degree: 'BSc', graduationDate: '2026' }],
    work_experiences: [
      { company: '', title: '' },
      { company: 'First Employer', title: 'Developer', bullets: ['Keep this bullet'] },
      { company: 'Current Employer', title: 'Engineer', startDate: '2025', endDate: 'Present', bullets: ['Replace this bullet'] }
    ],
    projects: [{ name: 'ResumeAI', technologies: 'React', bullets: ['Built a preview'] }],
    selectedExperienceIndex: 2
  };
  const before = structuredClone(profile);
  const output = buildInterviewResumeText(profile, ['Tailored bullet']);
  for (const expected of ['Example Candidate', 'Languages: JavaScript', 'Example University', 'BSc', '2026', 'First Employer', 'Keep this bullet', 'Current Employer', '2025 - Present', 'Tailored bullet', 'ResumeAI', 'Built a preview']) {
    assert.ok(output.includes(expected), `Missing ${expected}`);
  }
  for (const excluded of ['Legacy skills', 'Legacy experience', 'Replace this bullet']) assert.ok(!output.includes(excluded));
  assert.deepEqual(profile, before);
});

test('keeps legacy profile context and supports an empty profile', () => {
  const output = buildInterviewResumeText({ name: 'Candidate', skills: 'SQL', experience: 'Developer' }, ['Generated bullet']);
  for (const expected of ['Candidate', 'SQL', 'Developer', 'Generated bullet']) assert.ok(output.includes(expected));
  assert.equal(buildInterviewResumeText({}), '');
});

test('uses the original bullets when no tailored points exist', () => {
  assert.ok(buildInterviewResumeText({ work_experiences: [{ company: 'Employer', bullets: ['Original'] }], selectedExperienceIndex: 0 }).includes('- Original'));
});
