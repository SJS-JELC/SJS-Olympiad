import { test as base, expect, type Page } from '@playwright/test';
// Production HTTP/service/marker boundary runs in Node, never in the browser bundle.
// @ts-expect-error JavaScript API modules intentionally use Node ESM.
import { createService } from '../../api/src/service.mjs';
// @ts-expect-error JavaScript API modules intentionally use Node ESM.
import { handle } from '../../api/src/http.mjs';
import { mockFullscreen } from './fullscreen';
export { expect };
export type { Page };
type Row = {
    partitionKey: string;
    rowKey: string;
    etag?: string;
    [key: string]: unknown;
};
export type ApiHarness = {
    service: any;
    repo: any;
    token: string | null;
    requests: {
        action: string;
        body: any;
    }[];
    role: 'teacher' | 'competitor' | null;
    setTime: (value: number) => void;
    fail: Set<string>;
    lostResponses: Set<string>;
};
type Options = {
    accessRole: 'teacher' | 'competitor' | null;
};
export const test = base.extend<Options & {
    api: ApiHarness;
}>({
    accessRole: ['teacher', { option: true }],
    api: [async ({ page, accessRole }, use) => {
            const rows = new Map<string, Row>();
            let version = 0, time = Date.now();
            const key = (p: string, r: string) => p + '/' + r;
            const clone = <T,>(value: T): T => structuredClone(value);
            const conflict = () => { throw Object.assign(new Error('Conflict'), { statusCode: 412 }); };
            const check = (entity: Row, etag?: string) => { const old = rows.get(key(entity.partitionKey, entity.rowKey)); if (etag ? old?.etag !== etag : !!old)
                conflict(); };
            const save = (entity: Row) => rows.set(key(entity.partitionKey, entity.rowKey), clone({ ...entity, etag: String(++version) }));
            const repo = { get: async (p: string, r: string) => clone(rows.get(key(p, r)) ?? null), write: async (entity: Row, etag?: string) => { check(entity, etag); save(entity); }, batch: async (operations: {
                    entity: Row;
                    etag?: string;
                    remove?: boolean;
                }[]) => { for (const op of operations)
                    check(op.entity, op.etag); for (const op of operations)
                    op.remove ? rows.delete(key(op.entity.partitionKey,op.entity.rowKey)) : save(op.entity); }, list: async (filters: Record<string, unknown> = {}) => clone([...rows.values()].filter(row => Object.entries(filters).every(([key, value]) => row[key] === value))) };
            const service = createService(repo, {}, () => time), teacher = await service.login({ role: 'teacher', code: '5678' });
            for (const year of ['L6', 'L5', 'U5', 'U6'])
                await service.eventCreate(teacher.token, { name: year + ' fixture event', year, theoryStartsAt: time - 3600000, theoryEndsAt: time + 6 * 3600000 });
            const settings = await repo.get('system', 'settings');
            settings!.events = (settings!.events as any[]).map(event => ({ ...event, id: 'fixture-' + event.year, status: event.year === 'L6' ? 'active' : 'draft' }));
            await repo.write(settings!, settings!.etag);
            for (const event of settings!.events as any[])
                await service.teamAdd(teacher.token, { eventId: event.id, name: 'Test team 1' });
            const api: ApiHarness = { service, repo, token: accessRole ? (await service.login({ role: accessRole, code: accessRole === 'teacher' ? '5678' : '1234' })).token : null, role: accessRole, requests: [], setTime: value => { time = value; }, fail: new Set(), lostResponses: new Set() };
            await page.route('**/api/olympiad/**', async (route) => {
                const url = new URL(route.request().url()), action = url.pathname.split('/').at(-1)!;
                if (api.fail.has(action)) {
                    await route.fulfill({ status: 503, json: { error: 'Test service unavailable.' } });
                    return;
                }
                const body = route.request().method() === 'POST' ? route.request().postDataJSON() : undefined;
                api.requests.push({ action, body });
                try {
                    time = await page.evaluate(() => Date.now());
                }
                catch { /* retain test clock during navigation */ }
                const response = await handle({ method: route.request().method(), params: { action }, query: Object.fromEntries(url.searchParams), headers: { ...route.request().headers(), origin: 'https://olympiad.masters-of-chemistry.app', ...(api.token ? { cookie: '__Host-olympiad-session=' + api.token } : {}) }, body, rawBody: route.request().postData() ?? undefined }, () => service);
                const cookie = response.headers['Set-Cookie'];
                if (cookie)
                    api.token = /__Host-olympiad-session=([a-zA-Z0-9._-]+)/.exec(cookie)?.[1] ?? null;
                if (api.lostResponses.delete(action)) {
                    await route.abort('failed');
                    return;
                }
                await route.fulfill({ status: response.status, headers: response.headers, json: response.body });
            });
            await use(api);
        }, { auto: true }],
});
export async function loginCompetitor(page: Page, draftId?: string) {
    await expect(page.getByLabel('Competitor code')).toBeVisible();
    await page.getByLabel('Competitor code').fill('1234');
    await page.locator('form').filter({has:page.getByLabel('Competitor code',{exact:true})}).getByRole('button', { name:'GO',exact:true }).click();
    if(draftId){await page.getByLabel('Draft event',{exact:true}).selectOption(draftId);await page.getByRole('button',{name:'Test draft',exact:true}).click();}
    await expect(page.getByRole('button', {name:'LOCK IN',exact:true})).toBeVisible();
    await page.locator('input[name=team]:not(:disabled)').first().check();
}
export async function claimAndStart(page: Page, draftId?: string) {
    await loginCompetitor(page,draftId);
    await page.getByRole('button', { name: 'LOCK IN', exact: true }).click();
    await page.getByRole('button', { name: 'GO', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Theoretical Challenge' })).toBeVisible();
}
export async function resumeCompetition(page: Page) {
    await page.getByLabel('Teacher code', { exact: true }).fill('5678');
    await page.getByRole('button', { name: 'CONFIRM' }).click();
    await page.getByRole('button', { name: 'Resume competition' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
}
export async function activateEvent(api: ApiHarness, year: string) {
    const staff = await api.service.login({ role: 'teacher', code: '5678' }), state = await api.service.session(staff.token);
    if (state.activeEvent?.year === year)
        return;
    if (state.activeEvent)
        await api.service.eventEnd(staff.token, { eventId: state.activeEvent.id, expectedRevision:state.activeEvent.revision,confirm: true });
    await api.service.eventActivate(staff.token, { eventId: 'fixture-' + year,expectedRevision:state.events.find((event:any)=>event.id==='fixture-'+year).revision, confirm: true });
}
export async function openCompetitorQuestion(page: Page, api: ApiHarness, year: string, number?: number) {
    await activateEvent(api, year);
    await mockFullscreen(page);
    await page.goto('/');
    await claimAndStart(page);
    await page.getByRole('button', { name: 'Theoretical Challenge' }).click();
    await expect(page.locator('.theory-stage')).toBeVisible();
    if (number)
        await page.getByRole('button', { name: new RegExp(`^Problem ${number},`) }).click();
    if(number)await expect(page.locator('.question-brief')).toBeVisible();
}
