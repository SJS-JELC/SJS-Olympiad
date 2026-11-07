import {eventTiming} from './event-timing.mjs';
import {performanceSnapshot} from './telemetry.mjs';

const validId=value=>typeof value==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
const instant=value=>Number.isSafeInteger(value) && Math.abs(value)<=8640000000000000 ? value : null;

/** Explicit projection only. Never spread settings, config or process.env into a
 * diagnostic response, even for teachers. Credentials and team data stay private.
 */
export function diagnosticSnapshot(settings,config,now,sessionDurationMs){
 const runtime=config.runtime ?? {};
 const repository=['azure-table','memory'].includes(runtime.repository)?runtime.repository:'injected';
 const events=settings.events.map(raw=>{
  const event=eventTiming(raw);
  return {id:event.id,name:event.name,year:event.year,status:event.status,revision:event.revision,
   hasBeenActive:event.hasBeenActive===true,previousEventId:validId(event.previousEventId)?event.previousEventId:null,
   theoryStartsAt:instant(event.theoryStartsAt),theoryEndsAt:instant(event.theoryEndsAt),
   practicalStartsAt:instant(event.practicalStartsAt),practicalEndsAt:instant(event.practicalEndsAt),endsAt:instant(event.endsAt),
   timingSource:{theoryStartsAt:raw.theoryStartsAt==null?'legacy unbounded':'saved settings',
    theoryEndsAt:raw.theoryEndsAt==null?'legacy endsAt':'saved settings',practical:raw.practicalStartsAt==null?'not configured':'saved settings',endsAt:'derived latest challenge end'}};
 });
 const active=events.find(event=>event.status==='active'),draft=events.findLast(event=>event.status==='draft');
 return {snapshotAt:now,nodeVersion:process.version,repository,performance:performanceSnapshot(),
  storageConfigured:typeof runtime.storageConfigured==='boolean'?runtime.storageConfigured:null,
  tableName:repository==='azure-table'?'OlympiadPilot':null,
  configurationSource:runtime.source==='environment'?'production environment':runtime.source==='local-preview'?'isolated local preview':'injected service configuration',
  sessionDurationMs,clockSource:'server',settingsSource:'persisted backend settings',settingsRevision:settings.revision,
  accessCodes:{competitorConfigured:typeof settings.competitorHash==='string'&&!!settings.competitorHash,teacherConfigured:typeof settings.teacherHash==='string'&&!!settings.teacherHash},
  legacyBootstrap:{eventId:validId(config.eventId)?config.eventId:null,eventIdStatus:config.eventId==null?'not configured':validId(config.eventId)?'configured':'invalid',
   endsAt:instant(config.endsAt),endStatus:instant(config.endsAt)!==null?'configured':'not configured or invalid',purpose:'initial legacy bootstrap only; saved settings remain authoritative'},
  legacyTestingEventId:validId(settings.testingEventId)?settings.testingEventId:null,
  currentEventId:(active??draft)?.id??null,currentEventSource:active?'active event':draft?'latest draft':'none',events};
}
