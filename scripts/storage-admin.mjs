import {mkdir,readFile,writeFile,open,unlink,rename} from 'node:fs/promises';
import path from 'node:path';
import {operatorRoot,tableClient,target} from './azure-table-tools.mjs';
import {executeReset,previewReset,resetSummary} from './storage-reset.mjs';

const [command,...args]=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i===-1?undefined:args[i+1];};
const max=Number(option('--max-attempts'));
if(!['preview','reset'].includes(command)||!Number.isInteger(max)||max<1||max>100000){
 console.log('Usage: storage-admin.mjs preview --max-attempts N');
 console.log('       storage-admin.mjs reset --plan UUID --confirm sjsolympiaddata/OlympiadPilot --app-idle --max-attempts N');
 console.log('Preview and reset require separate operator authorisation. No command deletes the table itself.');
 process.exitCode=1;
}else{
 await mkdir(operatorRoot,{recursive:true});
 const lockPath=path.join(operatorRoot,'reset.lock');let lock,attempts=0,plan;
 const persist=async value=>{
  const destination=path.join(operatorRoot,`reset-${value.id}.json`),temporary=destination+'.tmp';
  await writeFile(temporary,JSON.stringify(value),{mode:0o600});await rename(temporary,destination);
 };
 try{
  lock=await open(lockPath,'wx');
  if(command==='reset'){
   const id=option('--plan');
   if(!/^[a-f0-9-]{36}$/i.test(id??'')||option('--confirm')!==`${target.account}/${target.table}`||!args.includes('--app-idle'))throw Error('Target confirmation, preview ID and idle-app acknowledgement are required.');
   plan=JSON.parse(await readFile(path.join(operatorRoot,`reset-${id}.json`),'utf8'));
  }
  const policy={name:'operatorBudget',async sendRequest(request,next){
   if(attempts>=max)throw Error('Operator HTTP budget exhausted. Resume only after reviewing the journal and authorising a new bounded run.');
   attempts++;if(plan){plan.httpAttempts=(plan.httpAttempts??0)+1;await persist(plan);}return next(request);
  }};
  const client=await tableClient({policy});
  if(command==='preview'){plan=await previewReset(client,target);plan.httpAttempts=attempts;await persist(plan);}
  else await executeReset(client,plan,{persist,expectedTarget:target});
  console.log(JSON.stringify({...resetSummary(plan),httpAttemptsThisRun:attempts},null,2));
 }catch(error){
  // SDK errors can contain signed URLs or payloads. Only locally-owned messages are printed.
  const local=error instanceof Error&&!('statusCode' in error)&&!('request' in error)&&!('response' in error);
  console.error(local&&/^(Target confirmation|Reset journal|Preserved configuration|Settings contain|Configured access codes|School directory|Pilot setting|Storage layout|Data changed|Unexpected writes|Disposable records|Preservation verification|Reset ownership|Operator HTTP budget|Azure CLI authentication|The configured storage account|Required preserved|A reset is already)/.test(error.message)?error.message:'Storage operation did not complete. Keep the app idle and inspect the operator journal; no raw service error is displayed.');
  process.exitCode=1;
 }finally{if(lock){await lock.close();await unlink(lockPath);}}
}
