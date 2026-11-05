import {test,expect,type ApiHarness,type Page} from './fixtures';
import {mockFullscreen} from './fullscreen';
const anonymous=test.extend({accessRole:null});
async function prepare(api:ApiHarness,year:string,past=false,count=3){
 const staff=(await api.service.login({role:'teacher',code:'5678'})).token;
 for(const event of (await api.service.events(staff)).events.filter((event:any)=>event.status!=='ended'))await api.service.eventEnd(staff,{eventId:event.id,expectedRevision:event.revision,confirm:true});
 const now=Date.now(),start=past?now-86400000:now+86400000;
 const event=(await api.service.eventCreate(staff,{name:'Synthetic '+year+' draft',year,theoryStartsAt:start,theoryEndsAt:start+3600000,practicalStartsAt:start+7200000,practicalEndsAt:start+10800000})).events.at(-1);
 for(let index=1;index<=count;index++)await api.service.teamAdd(staff,{eventId:event.id,name:`Draft team ${String(index).padStart(2,'0')}`});
 return {staff,event};
}
async function signIn(page:Page,complete=false){
 await page.goto('/');await page.getByLabel('Competitor code',{exact:true}).fill('1234');
 await page.locator('form').filter({has:page.getByLabel('Competitor code',{exact:true})}).getByRole('button',{name:'GO',exact:true}).click();
 await expect(complete?page.getByRole('heading',{name:'Event complete',exact:true}):page.getByRole('group',{name:'Teams',exact:true})).toBeVisible();
}
async function chooseAndStart(page:Page){
 await page.getByLabel('Draft team 01',{exact:true}).check();await page.getByRole('button',{name:'LOCK IN',exact:true}).click();
 await expect(page.getByLabel('Team: Draft team 01',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'GO',exact:true}).click();
}
async function durable(api:ApiHarness){return (await api.repo.list({})).filter((row:any)=>!['session','limit'].includes(row.kind));}

for(const [width,height] of [[1366,768],[1920,1080]])anonymous(`dense draft roster shows many real team names at ${width}x${height}`,async({page,api},testInfo)=>{
 await page.setViewportSize({width,height});await prepare(api,'U5',false,40);await api.service.pilot();const before=await durable(api);
 await signIn(page);await expect(page.locator('.team-tile')).toHaveCount(44);await page.getByLabel('Draft team 01',{exact:true}).check();
 const metrics=await page.locator('.team-grid').evaluate(grid=>{
  const area=grid.getBoundingClientRect(),tiles=[...grid.querySelectorAll<HTMLElement>('.team-tile')].map(tile=>tile.getBoundingClientRect());
  return {visible:tiles.filter(tile=>tile.top>=area.top&&tile.bottom<=area.bottom&&tile.left>=area.left&&tile.right<=area.right).length,width:tiles[0].width,height:tiles[0].height};
 });
 expect(metrics.visible).toBe(44);expect(metrics.width).toBeGreaterThan(100);expect(metrics.height).toBeGreaterThan(30);
 // Glyphs may extend beyond the line box; the visible tile is the fit boundary.
 const overflow=await page.locator('.team-tile__name').evaluateAll(names=>names.filter(name=>{const range=document.createRange();range.selectNodeContents(name);const text=range.getBoundingClientRect(),tile=name.closest('.team-tile')!.getBoundingClientRect();return text.top<tile.top || text.bottom>tile.bottom || text.left<tile.left || text.right>tile.right;}).map(name=>name.textContent));expect(overflow).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(page.getByRole('button',{name:'LOCK IN',exact:true})).toBeEnabled();await expect(page.locator('.hazard-lock img')).toHaveAttribute('aria-hidden','true');
 await page.screenshot({path:testInfo.outputPath(`draft-team-grid-${width}x${height}.png`)});expect(await durable(api)).toEqual(before);
});

for(const [year,past] of [['U5',false],['U5',true],['L6',false],['L6',true]] as const)anonymous(`${year} ${past?'past':'future'} draft respects its starts before opening its own questions with durable claims and results`,async({page,api})=>{
 const {event,staff}=await prepare(api,year,past);await mockFullscreen(page);await signIn(page,past);
 if(past){await expect(page.getByRole('button',{name:'LOCK IN',exact:true})).toHaveCount(0);expect((await api.repo.list({kind:'team',eventId:event.id})).every((team:any)=>!team.owner&&team.score===0)).toBe(true);return;}
 await chooseAndStart(page);await expect(page.locator('.competitor-team-pill__practice')).toHaveCount(0);
 const theory=page.getByRole('button',{name:/^Theoretical Challenge$/i}),practical=page.getByRole('button',{name:/^Practical Challenge$/i});
 await expect(theory).toBeDisabled();await expect(practical).toBeDisabled();
 const now=Date.now();await api.service.eventUpdate(staff,{eventId:event.id,expectedRevision:event.revision,theoryStartsAt:now-60000,theoryEndsAt:now+3600000,practicalStartsAt:now-60000,practicalEndsAt:now+7200000});
 // A remote schedule becomes known on the next authorized request.
 const refreshed=await api.service.session(api.token);await page.evaluate(async()=>{history.pushState(null,'','?theory');dispatchEvent(new PopStateEvent('popstate'));});
 await expect(api.service.question(api.token,{questionId:year==='U5'?'U5P6':'L6P8'})).resolves.toHaveProperty('attempt');
 // Continue with a fresh claim because refresh intentionally revokes sessions.
 await api.service.teamRelease(staff,{eventId:event.id,teamId:refreshed.team.id,confirm:true});
 await signIn(page);await chooseAndStart(page);await expect(theory).toBeEnabled();
 if(year==='U5')await expect(practical).toBeDisabled();
 else{
  await expect(practical).toBeEnabled();await practical.click();await expect(page.locator('#practical-numPracticalResponse3')).toBeEditable();
  await page.locator('#practical-numPracticalResponse3').fill('12.34');await expect(page.locator('.practical-status')).toContainText('Saved');
  await page.getByRole('button',{name:'Back to landing',exact:true}).click();
 }
 await theory.click();await page.getByRole('button',{name:new RegExp(`^Problem ${year==='U5'?6:8},`)}).click();
 const answer=page.getByRole('textbox',{name:year==='U5'?'Greatest hydrogen separation in pm':'Equilibrium concentration of B',exact:true});await expect(answer).toBeEditable();
 await answer.fill(year==='U5'?'485':'0.437');await page.getByRole('button',{name:'Check answers',exact:true}).click();await expect(page.locator('.completion-stamp')).toBeVisible();
 const state=await api.service.session(api.token);expect(state.activeEvent.year).toBe(year);expect(state.score).toBe(year==='U5'?2:3);
 const team=(await api.repo.list({kind:'team',eventId:event.id})).find((row:any)=>row.teamId===state.team.id);expect(team.owner).toBeTruthy();expect(team.hasSubmittedActivity).toBe(true);
 expect((await api.service.leaderboard(staff)).rows[0].score).toBe(state.score);
 await page.reload();await signIn(page);await expect(page.locator('input[name=team][value="'+state.team.id+'"]')).toBeDisabled();
});

anonymous('an active future event keeps real schedules and never receives draft bypass',async({page,api})=>{
 const {staff,event}=await prepare(api,'L6');await api.service.eventActivate(staff,{eventId:event.id,expectedRevision:event.revision});
 await mockFullscreen(page);await signIn(page);await chooseAndStart(page);
 await expect(page.locator('.competitor-team-pill__practice')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/^Theoretical Challenge$/i})).toBeDisabled();await expect(page.getByRole('button',{name:/^Practical Challenge$/i})).toBeDisabled();
 await page.evaluate(()=>{history.pushState(null,'','?theory&question=8');dispatchEvent(new PopStateEvent('popstate'));});await expect(page.locator('.question-content')).toHaveCount(0);
 await expect(api.service.question(api.token,{questionId:'L6P8'})).rejects.toMatchObject({status:403});
});
