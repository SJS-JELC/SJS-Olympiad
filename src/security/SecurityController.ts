import { HttpError, request, type SessionState } from '../cloud/api';
import type { SecurityEventType, SecurityView } from './securityTypes';
import type { Attempt } from '../questions/attempts';
import { eventTiming, theoryPhase, practicalPhase } from '../events/timing';
const initial = (): SecurityView => ({ session: { status: 'NOT_STARTED', eventCount: 0 }, events: [], phase: 'loading', error: null, storageHealthy: true, server: null, recoveryReady: false });
type Transport = typeof request;
/** The server cookie is the authority. Browser state only makes access more restrictive. */
export class SecurityController {
    private view = initial();
    private listeners = new Set<() => void>();
    private generation = 0;
    private initialized?: Promise<void>;
    private grant: string | null = null;
    private checking: Promise<boolean> | null = null;
    private clockDelta = 0;
    private activationSent = false;
    private scheduleState = '';
    constructor(private transport: Transport = request) { }
    getSnapshot = () => this.view;
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    private publish(next: SecurityView) { this.view = next; this.listeners.forEach(fn => fn()); }
    private event(type: SecurityEventType) { return { id: crypto.randomUUID(), type, at: new Date().toISOString() }; }
    private valid(token: number) { return token === this.generation && (this.view.phase==='entering'||this.view.phase==='unlocking') && !document.hidden && document.hasFocus() && document.fullscreenElement === document.documentElement; }
    private error(error: unknown) { return error instanceof Error ? error.message : 'The competition service is unavailable.'; }
    private accept(server: SessionState, allowActive = false) {
        if (!server || !['teacher', 'competitor'].includes(server.role) || !Number.isFinite(server.serverNow) || !Number.isFinite(server.expiresAt) || server.expiresAt <= server.serverNow || !server.competition || !['NOT_STARTED', 'ACTIVE', 'LOCKED'].includes(server.competition.status))
            throw new Error('The server session could not be verified.');
        this.clockDelta = Date.now() - server.serverNow;
        const competitor = server.role === 'competitor';
        let status = competitor ? server.competition.status : 'NOT_STARTED';
        if (status === 'ACTIVE') {
            if (this.eventClosed(server)) status = 'NOT_STARTED';
            else if (!allowActive || document.fullscreenElement !== document.documentElement || !this.eventActive(server)) status = 'LOCKED';
        }
        this.publish({ ...this.view, server, session: { ...this.view.session, status, eventCount: this.view.events.length }, phase: 'idle', storageHealthy: true, error: null });
    }
    private acknowledgeBreach(server: SessionState) {
        if (this.view.session.status === 'LOCKED' && server.competition.epoch >= (this.view.server?.competition.epoch ?? 0))
            this.publish({ ...this.view, server });
    }
    private async restoreLock(token:number){
        try{
            const server=await this.transport<SessionState>('session?restore=1');
            if(token===this.generation)this.accept(server);
        }catch(error){
            if(token!==this.generation)return;
            if(error instanceof HttpError&&error.status===401){this.grant=null;this.publish({...initial(),phase:'idle',error:this.error(error)});}
            else this.publish({...this.view,phase:'idle',storageHealthy:false,error:'The activation result could not be verified. Staff recovery is required.'});
        }
    }
    initialize = () => this.initialized ??= this.restore();
    private async restore() {
        const token = ++this.generation;
        try {
            const server = await this.transport<SessionState>('session?restore=1');
            if (token !== this.generation)
                return;
            this.accept(server);
        }
        catch (error) {
            if (token !== this.generation)
                return;
            if (error instanceof HttpError && error.status === 401)
                this.publish({ ...initial(), phase: 'idle' });
            else
                this.publish({ ...this.view, phase: 'idle', storageHealthy: false, error: this.error(error) });
        }
    }
    login = async (code: string, role: 'competitor' | 'teacher' = 'competitor') => {
        if (this.view.phase !== 'idle')
            return;
        const token = ++this.generation;
        this.publish({ ...this.view, phase: 'loading', error: null });
        try {
            const value = await this.transport<SessionState>('login', { code, role });
            if (token === this.generation)
                this.accept(value);
        }
        catch (error) {
            if (token === this.generation)
                this.publish({ ...this.view, phase: 'idle', error: this.error(error), storageHealthy: true });
        }
    };
    refresh = (): Promise<boolean> => {
        if(this.view.phase!=='idle')return Promise.resolve(false);
        if (this.checking)
            return this.checking;
        const token = this.generation;
        this.checking = (async () => {
            try {
                const server = await this.transport<SessionState>('session');
                if (token !== this.generation)
                    return false;
                const wasActive = this.view.session.status === 'ACTIVE';
                // A poll cannot unlock a locally locked session.
                this.accept(server, wasActive);
                if(server.role==='competitor'&&server.competition.status==='ACTIVE'&&!wasActive){await this.restoreLock(token);return false;}
                return this.canAccess();
            }
            catch (error) {
                if (token === this.generation) {
                    if (error instanceof HttpError && error.status === 401) {
                        this.generation++;
                        this.grant = null;
                        this.publish({ ...initial(), phase: 'idle', error: this.error(error) });
                    }
                    else {
                        this.interrupt('SESSION_INTERRUPTED');
                        this.publish({ ...this.view, storageHealthy: false, error: this.error(error) });
                    }
                }
                return false;
            }
            finally {
                this.checking = null;
            }
        })();
        return this.checking;
    };
    private eventActive(server: SessionState) { const event = server.activeEvent, team = server.team; return !!event && event.status === 'active' && !!team && team.eventId === event.id && team.year === event.year && this.serverNow() < eventTiming(event).endsAt; }
    private eventClosed(server: SessionState) { const event = server.activeEvent; return !event || event.status !== 'active' || this.serverNow() >= eventTiming(event).endsAt; }
    private closeEvent() {
        this.generation++; this.grant = null;
        this.publish({ ...this.view, session: { ...this.view.session, status: 'NOT_STARTED' }, phase: 'idle', recoveryReady: false });
    }
    serverNow = () => Date.now() - this.clockDelta;
    canAccessTheory = () => this.canAccess() && (this.view.server?.role === 'teacher' || theoryPhase(this.view.server?.activeEvent, this.serverNow()) === 'open');
    canAccessPractical = () => this.canAccess() && (this.view.server?.role === 'teacher' || practicalPhase(this.view.server?.activeEvent, this.serverNow()) === 'open');
    canAccess = () => this.view.storageHealthy && this.view.phase === 'idle' && !!this.view.server && Date.now() < this.view.server.expiresAt + this.clockDelta && (this.view.server.role === 'teacher' || (this.view.session.status === 'ACTIVE' && this.view.server.competition.status === 'ACTIVE' && this.eventActive(this.view.server) && document.fullscreenElement === document.documentElement));
    checkBoundary = () => {
        if (this.view.server?.role !== 'competitor') return;
        if (this.eventClosed(this.view.server) && (this.view.session.status !== 'NOT_STARTED' || this.view.phase === 'entering' || this.view.phase === 'unlocking')) {
            // A scheduled/manual end is not a competition-mode breach.
            this.closeEvent();
        } else if (this.view.session.status === 'ACTIVE' && !this.canAccess()) this.interrupt('SESSION_INTERRUPTED');
        const phase = theoryPhase(this.view.server?.activeEvent, this.serverNow()) + ':' + practicalPhase(this.view.server?.activeEvent, this.serverNow());
        if (this.scheduleState !== phase) {
            this.scheduleState = phase;
            this.publish({ ...this.view });
        }
    };
    guard = async () => { if (!this.canAccess())
        return false; return this.refresh(); };
    guardTheory = async () => this.canAccessTheory() && await this.refresh() && this.canAccessTheory();
    guardPractical = async () => this.canAccessPractical() && await this.refresh() && this.canAccessPractical();
    claim = async (teamId: string) => {
        const server = await this.transport<SessionState>('claim', { teamId, requestId: crypto.randomUUID() });
        this.accept(server);
    };
    start = async () => {
        if (this.view.phase !== 'idle' || this.view.server?.role !== 'competitor' || !this.view.server.team || this.view.session.status !== 'NOT_STARTED')
            return;
        const token = ++this.generation;
        this.activationSent = false;
        this.publish({ ...this.view, phase: 'entering', error: null });
        try {
            await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
            if (!this.valid(token))
                throw new Error('Entry was interrupted. Keep this tab visible and focused.');
            this.activationSent = true;
            const server = await this.transport<SessionState>('start', { epoch: this.view.server!.competition.epoch, requestId: crypto.randomUUID() });
            if (!this.valid(token)) {
                if (!this.eventClosed(server)) void this.transport<SessionState>('breach', { epoch: server.competition.epoch, reason: 'SESSION_INTERRUPTED', requestId: crypto.randomUUID() }).then(value => this.acknowledgeBreach(value)).catch(() => { });
                return;
            }
            this.accept(server, true);
        }
        catch (error) {
            if (token === this.generation){
                if(this.activationSent){
                    const event=this.event('SESSION_INTERRUPTED'),events=[...this.view.events,event];
                    this.publish({...this.view,session:{...this.view.session,status:'LOCKED',lockedAt:event.at,lockReason:event.type,eventCount:events.length},events,phase:'unlocking',recoveryReady:false,error:'The start result was not confirmed.'});
                    await this.restoreLock(token);
                }else this.publish({ ...this.view, phase: 'idle', error: this.error(error) });
            }
        }
    };
    interrupt = (reason: SecurityEventType) => {
        if (this.view.server?.role !== 'competitor')
            return;
        if (this.eventClosed(this.view.server)) { this.closeEvent(); return; }
        if (this.view.session.status !== 'ACTIVE' && this.view.phase !== 'entering' && this.view.phase !== 'unlocking')
            return;
        this.generation++;
        this.grant = null;
        if (this.view.session.status === 'NOT_STARTED' && !this.activationSent) {
            this.publish({ ...this.view, phase: 'idle', error: 'Entry was interrupted. Try again while this tab is visible and focused.' });
            return;
        }
        const event = this.event(reason), events = [...this.view.events, event];
        this.publish({ ...this.view, session: { ...this.view.session, status: 'LOCKED', lockedAt: event.at, lockReason: reason, eventCount: events.length }, events, phase: 'idle', recoveryReady: false });
        void this.transport<SessionState>('breach', { epoch: this.view.server!.competition.epoch, reason, requestId: event.id }).then(server => {
            // Report acknowledgements never activate content.
            this.acknowledgeBreach(server);
        }).catch(() => { this.publish({ ...this.view, storageHealthy: false, error: 'Connection lost. Staff recovery is required.' }); });
    };
    externalChange = (_incoming?: string | null) => this.interrupt('CROSS_TAB_CONFLICT');
    unlock = async (code: string) => {
        if (this.view.phase !== 'idle' || this.view.session.status !== 'LOCKED')
            return;
        const token = ++this.generation;
        this.publish({ ...this.view, phase: 'unlocking', error: null, recoveryReady: false });
        try {
            const server=await this.transport<SessionState>('session?restore=1');
            if(token!==this.generation)return;
            this.accept(server);
            if(server.competition.status==='NOT_STARTED')return;
            this.publish({...this.view,phase:'unlocking'});
            const result = await this.transport<{
                grant: string;
            }>('recovery', { code, expectedEpoch: this.view.server?.competition.epoch, requestId: crypto.randomUUID() });
            if (token !== this.generation)
                return;
            this.grant = result.grant;
            this.publish({ ...this.view, phase: 'idle', storageHealthy: true, recoveryReady: true });
        }
        catch (error) {
            if (token === this.generation)
                this.publish({ ...this.view, phase: 'idle', error: this.error(error) });
        }
    };
    resume = async () => {
        if (!this.grant || this.view.phase !== 'idle' || this.view.session.status !== 'LOCKED')
            return;
        const token = ++this.generation, grant = this.grant;
        let resumeSent=false;
        this.publish({ ...this.view, phase: 'unlocking', error: null });
        try {
            await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
            if (!this.valid(token))
                throw new Error('Resume was interrupted. Ask staff to verify again.');
            resumeSent=true;
            const server = await this.transport<SessionState>('resume', { grant, expectedEpoch: this.view.server?.competition.epoch, requestId: crypto.randomUUID() });
            this.grant = null;
            if (!this.valid(token)) {
                if (!this.eventClosed(server)) void this.transport<SessionState>('breach', { epoch: server.competition.epoch, reason: 'SESSION_INTERRUPTED', requestId: crypto.randomUUID() }).then(value => this.acknowledgeBreach(value)).catch(() => { });
                return;
            }
            this.accept(server, true);
            this.publish({ ...this.view, recoveryReady: false });
        }
        catch (error) {
            if (token === this.generation){
                this.grant=null;
                this.publish({ ...this.view, phase: resumeSent?'unlocking':'idle', recoveryReady: false, error: this.error(error) });
                if(resumeSent)await this.restoreLock(token);
            }
        }
    };
    update = (server: SessionState) => {
        if (server.team?.id === this.view.server?.team?.id && server.team?.claimGeneration === this.view.server?.team?.claimGeneration && server.competition.epoch < (this.view.server?.competition.epoch ?? 0))
            return;
        this.accept(server, this.view.session.status === 'ACTIVE');
    };
    recordQuestion = (id: string, attempt: Attempt, score: number) => {
        if (!this.view.server)
            return;
        this.publish({ ...this.view, server: { ...this.view.server, score: this.view.server.role === 'competitor' ? score : 0, attempts: { ...this.view.server.attempts, [id]: attempt } } });
    };
}
