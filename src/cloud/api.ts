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
    hasBeenActive?: boolean;
    revision: number;
    hostSetup?: {schoolId:string;requestId:string;status:'pending'|'complete'};
    rosterResetInput?: {eventId:string;requestId:string;year:string;expectedRevision:number;confirm?:boolean;confirmed?:boolean;name?:string;theoryStartsAt?:number|null;theoryEndsAt?:number;practicalStartsAt?:number|null;practicalEndsAt?:number|null;endsAt?:number};
};
export type SchoolRecord={id:string;name:string;isHostSchool:boolean;deleted?:boolean;revision:number;colours?:string[]};
export type SchoolProgress={requestId:string;schoolId:string;eventId:string;targetCount:number|null;kind:'generate'|'link';total:number;completed:number;status:'pending'|'complete'};
export type TeamRecord = {
    id: string;
    name: string;
    eventId: string;
    year: string;
    claimGeneration: number;
    schoolId?: string;
    schoolColours?: string[];
    teamNumber?: number;
    claimed?: boolean;
    score?: number;
    hasSubmittedActivity?: boolean;
    practical?: PracticalResult | null;
};
export type DiagnosticSnapshot={
 snapshotAt:number;nodeVersion:string;repository:'azure-table'|'memory'|'injected';storageConfigured:boolean|null;tableName:string|null;
 configurationSource:string;sessionDurationMs:number;clockSource:string;settingsSource:string;settingsRevision:number;
 accessCodes:{competitorConfigured:boolean;teacherConfigured:boolean};
 legacyBootstrap:{eventId:string|null;eventIdStatus:string;endsAt:number|null;endStatus:string;purpose:string};
 legacyTestingEventId:string|null;currentEventId:string|null;currentEventSource:string;
 events:(EventRecord&{previousEventId:string|null;timingSource:{theoryStartsAt:string;theoryEndsAt:string;practical:string;endsAt:string}})[];
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
    draftEvents?: {id:string;name:string;year:string}[];
    activeEvent: EventRecord | null;
    events?: EventRecord[];
    team: TeamRecord | null;
    competition: {
        status: 'NOT_STARTED' | 'ACTIVE' | 'LOCKED';
        epoch: number;
    };
    score: number;
    attempts: Record<string, Attempt>;
    hydration?: QuestionHydration;
};
/** Public, authorized state for every question in one event/year context. */
export type QuestionHydration = {
    eventId: string;
    year: string;
    serverNow: number;
    eventEndsAt: number;
    score: number;
    questions: Record<string, { attempt: Attempt; revision: number; data?: unknown }>;
};
export type QuestionState = {
    attempt: Attempt;
    revision: number;
    score: number;
    serverNow: number;
    eventEndsAt: number;
    data?: unknown;
    gcCompletedRunId?: number;
};
export class HttpError extends Error {
    constructor(public status: number, message: string, public code?: string) { super(message); }
}
export async function request<T>(action: string, body?: unknown, signal?:AbortSignal): Promise<T> {
    const response = await fetch('/api/olympiad/' + action, { credentials: 'same-origin', cache: 'no-store', signal, ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    const value = await response.json().catch(() => { throw new Error('The competition service is unavailable.'); });
    if (!response.ok)
        throw new HttpError(response.status, value.error || 'The request could not be completed.', value.code);
    return value;
}

/** Protected assets are bytes, never public URLs or base64 JSON. */
export async function requestAsset(body:unknown,signal?:AbortSignal):Promise<Blob> {
 const response=await fetch('/api/olympiad/content-asset',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok){const error=await response.json().catch(()=>({}));throw new HttpError(response.status,error.error || 'Unable to load question diagram.',error.code);}
 return response.blob();
}
