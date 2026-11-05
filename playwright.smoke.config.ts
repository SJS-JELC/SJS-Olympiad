import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Deployment gate: keep complete behavioural suites for the shared boundaries.
// Catalogue-wide parity, per-question layouts and editor viewport matrices stay
// in the default full suite, required on PRs and available by manual validation.
export default defineConfig({
  ...base,
  testMatch: [
    '**/access-code-fields.spec.ts',
    '**/current-event.spec.ts',
    '**/backend-diagnostics.spec.ts',
    '**/settings-lifecycle.spec.ts',
    '**/security.spec.ts',
    '**/cloud-question.spec.ts',
    '**/protected-content.spec.ts',
    '**/protected-practical.spec.ts',
    '**/selected-load-races.spec.ts',
    '**/pilot-entry.spec.ts',
    '**/pilot-loading.spec.ts',
    '**/pilot.spec.ts',
  ],
});
