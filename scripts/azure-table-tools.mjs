import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
import {mkdir,readFile,writeFile,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const target={account:'sjsolympiaddata',table:'OlympiadPilot'};
export const operatorRoot=path.join(process.env.LOCALAPPDATA??path.join(os.homedir(),'.local','share'),'SJS-Olympiad-Security-PoC','storage-admin');
const require=createRequire(new URL('../api/package.json',import.meta.url));

function azure(args){
 const python=process.env.AZURE_CLI_PYTHON??'C:/Program Files/Microsoft SDKs/Azure/CLI2/python.exe';
 try{
  return execFileSync(existsSync(python)?python:'az',existsSync(python)?['-IBm','azure.cli',...args]:args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}).trim();
 }catch{throw Error('Azure CLI authentication failed. Sign in locally and verify access to the named storage account. No credential output was retained.');}
}
export async function tableClient({policy}={}){
 const {TableClient,AzureNamedKeyCredential}=require('@azure/data-tables');
 const group=azure(['storage','account','list','--query',`[?name=='${target.account}'].resourceGroup | [0]`,'--output','tsv','--only-show-errors']);
 if(!group||group==='None')throw Error('The configured storage account was not found in the current Azure CLI subscription.');
 const key=azure(['storage','account','keys','list','--account-name',target.account,'--resource-group',group,'--query','[0].value','--output','tsv','--only-show-errors']);
 if(!key)throw Error('No account credential was returned.');
 return new TableClient(`https://${target.account}.table.core.windows.net`,target.table,new AzureNamedKeyCredential(target.account,key),{
  retryOptions:{maxRetries:0},...(policy?{additionalPolicies:[{policy,position:'perRetry'}]}:{})
 });
}

/** Persist an attempted-send reservation BEFORE transport. No retries, no implicit budget resets. */
export async function investigationBudget(root=operatorRoot){
 await mkdir(root,{recursive:true});
 const file=path.join(root,'performance-investigation-budget.json'),lock=file+'.lock';
 const handle=await open(lock,'wx').catch(()=>{throw Error('Investigation is already running, or its lock needs operator recovery.');});
 let ledger;
 try{ledger=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT'){await handle.close();await unlink(lock);throw Error('Cannot read investigation budget; refusing to reset it.');}ledger={limit:50,attempts:0,probes:[]};}
 if(ledger.limit!==50||!Number.isInteger(ledger.attempts)||ledger.attempts<0||ledger.attempts>50){await handle.close();await unlink(lock);throw Error('Invalid investigation ledger.');}
 let cleanup=false;
 const save=()=>writeFile(file,JSON.stringify(ledger),{mode:0o600});
 return {
  ledger,save,
  startCleanup(){cleanup=true;},
  policy:{name:'investigationBudget',async sendRequest(request,next){
   if(ledger.attempts>=50 || !cleanup&&ledger.attempts>=44)throw Error('Azure investigation budget exhausted; cleanup capacity is reserved.');
   ledger.attempts++;await save();return next(request);
  }},
  async close(){await handle.close();await unlink(lock);}
 };
}
