import type { StaffPinVerifier } from './securityTypes';
// GitHub Pages exposes this PIN in the public JavaScript bundle. It tests recovery UX only.
export const TEST_STAFF_PIN = '271828';
export const testStaffPinVerifier: StaffPinVerifier = { verify: pin => pin === TEST_STAFF_PIN };
export const SECURITY_RULES = { pageHidden: 'LOCK', windowBlur: 'LOCK', fullscreenExit: 'LOCK' } as const;
