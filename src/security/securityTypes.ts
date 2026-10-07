export type CompetitionStatus = 'NOT_STARTED' | 'ACTIVE' | 'LOCKED';
export type SecurityEventType = 'COMPETITION_STARTED' | 'PAGE_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'INVALID_STAFF_PIN' | 'STAFF_UNLOCK' | 'SESSION_RESET' | 'SESSION_INTERRUPTED' | 'CROSS_TAB_CONFLICT' | 'STORAGE_FAILURE';
export interface SecurityEvent { id: string; type: SecurityEventType; at: string; reason?: string; relatedSignals?: SecurityEventType[] }
export interface CompetitionSession { status: CompetitionStatus; startedAt?: string; lockedAt?: string; lockReason?: SecurityEventType; eventCount: number }
export interface SecuritySnapshot { version: 1; session: CompetitionSession; events: SecurityEvent[] }
export interface SecurityView { session: CompetitionSession; events: SecurityEvent[]; phase: 'loading' | 'idle' | 'entering' | 'unlocking'; error: string | null; storageHealthy: boolean }
export interface SnapshotAdapter { load(): Promise<SecuritySnapshot | null>; save(snapshot: SecuritySnapshot): Promise<void>; clear(): Promise<void> }
export interface StaffPinVerifier { verify(pin: string): boolean }
