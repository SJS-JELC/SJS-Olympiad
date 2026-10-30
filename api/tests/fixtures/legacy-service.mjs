// Regression fixture captured from HEAD c83f72912077488864c27c2bf37283ad43b7b810; only marking import relocated.
import { createHash, timingSafeEqual } from 'node:crypto';
import { mark } from './legacy-marking.mjs';
export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
const hash = text => createHash('sha256').update(text).digest('hex');
const conflict = error => [409, 412].includes(error.statusCode);
export function createService(repo, config, now = Date.now) {
  const { code, eventId, endsAt } = config;
  if (typeof code !== 'string' || code.length < 12 || !/^[a-zA-Z0-9-]{1,40}$/.test(eventId ?? '') || !Number.isFinite(endsAt)) throw new ApiError(503, 'The test event is not configured yet.');
  const active = () => { if (now() >= endsAt) throw new ApiError(403, 'This test event has ended.'); };
  const checkCode = value => {
    active();
    if (typeof value !== 'string' || !timingSafeEqual(Buffer.from(hash(value)), Buffer.from(hash(code)))) throw new ApiError(403, 'Event code not recognised.');
  };
  const teamPartition = id => eventId + '-' + id;
  const auth = async token => {
    if (typeof token !== 'string' || !/^test-[1-3]\.[a-f0-9]{64}$/.test(token)) throw new ApiError(401, 'Join a test team first.');
    const [id, secret] = token.split('.');
    const team = await repo.get(teamPartition(id), 'team');
    if (!team || team.sessionHash !== hash(secret) || now() >= team.expires) throw new ApiError(401, 'Your team session is unavailable or expired.');
    return team;
  };
  const view = team => ({ team: { id: team.teamId, name: team.name }, score: team.score, solvedAt: team.solvedAt || null, retryAt: team.retryAt, serverNow: now(), eventEndsAt: endsAt });
  return {
    async throttle(bucket, maximum) {
      const partitionKey = eventId + '-limits';
      const rowKey = bucket;
      for (let i = 0; i < 6; i++) {
        const old = await repo.get(partitionKey, rowKey);
        const count = old && now() < old.until ? old.count + 1 : 1;
        if (count > maximum) throw new ApiError(429, 'Too many requests. Please wait a minute.');
        const value = { partitionKey, rowKey, count, until: old && now() < old.until ? old.until : now() + 60000 };
        try { await repo.write(value, old?.etag); return; } catch(error) { if (!conflict(error)) throw error; }
      }
      throw new ApiError(429, 'The event is busy. Please retry shortly.');
    },
    async teams(value) {
      checkCode(value);
      const result = [];
      for (let i = 1; i <= 3; i++) if (!await repo.get(teamPartition('test-' + i), 'team')) result.push({id:'test-' + i,name:'Test team ' + i});
      return {teams:result};
    },
    async claim({code: value, teamId, claimSecret}, existing) {
      checkCode(value);
      if (existing) { try { return {token:existing, state:view(await auth(existing))}; } catch(error) { if (error.status !== 401) throw error; } }
      if (typeof teamId !== 'string' || !/^test-[1-3]$/.test(teamId) || typeof claimSecret !== 'string' || !/^[a-f0-9]{64}$/.test(claimSecret)) throw new ApiError(400, 'Invalid team claim.');
      const team = { partitionKey:teamPartition(teamId), rowKey:'team', teamId, name:'Test team ' + teamId.at(-1), sessionHash:hash(claimSecret), expires:endsAt, score:0, solvedAt:0, retryAt:0 };
      try { await repo.write(team); } catch(error) {
        if (!conflict(error)) throw error;
        const old = await repo.get(team.partitionKey, 'team');
        if (old?.sessionHash !== team.sessionHash) throw new ApiError(409, 'That team is already claimed. Choose another.');
      }
      const token = teamId + '.' + claimSecret;
      return {token, state:view(await auth(token))};
    },
    async session(token) { return view(await auth(token)); },
    async submit(token, {questionId, requestId, answer}) {
      if (questionId !== 'L6P8' || typeof answer !== 'string' || answer.length > 64 || typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw new ApiError(400, 'Invalid submission.');
      for (let i = 0; i < 6; i++) {
        const team = await auth(token);
        const old = await repo.get(team.partitionKey, 'attempt-' + requestId);
        if (old) {
          if (old.answer !== answer) throw new ApiError(409, 'This submission identifier was already used for another answer.');
          return { ...view(team), correct:old.correct };
        }
        active();
        if (!team.solvedAt && now() < team.retryAt) throw new ApiError(429, 'Wait until the cooldown ends.');
        const correct = !!team.solvedAt || mark(answer);
        const updated = { ...team, score:correct ? 3 : 0, solvedAt:team.solvedAt || (correct ? now() : 0), retryAt:correct ? 0 : now() + 15000 };
        const attempt = { partitionKey:team.partitionKey, rowKey:'attempt-' + requestId, questionId, answer, correct, submittedAt:now() };
        try { await repo.commit(updated, team.etag, attempt); return {...view(updated),correct}; }
        catch(error) { if (!conflict(error)) throw error; }
      }
      throw new ApiError(409, 'Another submission is being saved. Retry the same answer.');
    },
  };
}
