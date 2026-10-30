import type { Attempt } from '../questions/attempts';
export type EventRecord = {
    id: string;
    name: string;
    year: string;
    endsAt: number;
    theoryStartsAt?: number | null;
    theoryEndsAt?: number;
    practicalStartsAt?: number | null;
    practicalEndsAt?: number | null;
    status: 'draft' | 'active' | 'ended';
    revision: number;
};
export type TeamRecord = {
    id: string;
    name: string;
    eventId: string;
    year: string;
    claimGeneration: number;
    claimed?: boolean;
    score?: number;
    hasSubmittedActivity?: boolean;
    practical?: PracticalResult | null;
};
export type PracticalYear = 'L5' | 'L6' | 'U6';
export type PracticalField = 'numPracticalResponse1' | 'numPracticalResponse2' | 'numPracticalResponse3' | 'numPracticalResponse4';
export type PracticalResponse = { text: string; value: number };
export type PracticalResult = { year: PracticalYear; revision: number; responses: Partial<Record<PracticalField, PracticalResponse | null>>; finalField: 'numPracticalResponse4'; updatedAt: number | null };
export type PracticalView = PracticalResult & { serverNow: number; eventEndsAt: number | null; readOnly: boolean };
export type SessionState = {
    role: 'competitor' | 'teacher';
    expiresAt: number;
    serverNow: number;
    configRevision: number;
    activeEvent: EventRecord | null;
    events?: EventRecord[];
    team: TeamRecord | null;
    competition: {
        status: 'NOT_STARTED' | 'ACTIVE' | 'LOCKED';
        epoch: number;
    };
    score: number;
    attempts: Record<string, Attempt>;
};
export type QuestionState = {
    attempt: Attempt;
    revision: number;
    score: number;
    serverNow: number;
    eventEndsAt: number;
    data?: unknown;
};
export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}
export async function request<T>(action: string, body?: unknown): Promise<T> {
    const response = await fetch('/api/olympiad/' + action, { credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    const value = await response.json().catch(() => { throw new Error('The competition service is unavailable.'); });
    if (!response.ok)
        throw new HttpError(response.status, value.error || 'The request could not be completed.');
    return value;
}
