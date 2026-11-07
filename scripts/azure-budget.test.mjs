import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {investigationBudget} from './azure-table-tools.mjs';

test('persistent investigation budget reserves cleanup and never sends attempt 51',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'olympiad-budget-'));let budget,sends=0;
 const send=async()=>{sends++;return {};};
 try{
  budget=await investigationBudget(root);
  for(let n=0;n<44;n++)await budget.policy.sendRequest({},send);
  await assert.rejects(budget.policy.sendRequest({},send),/cleanup capacity/);assert.equal(sends,44);
  budget.startCleanup();for(let n=0;n<6;n++)await budget.policy.sendRequest({},send);
  await assert.rejects(budget.policy.sendRequest({},send),/budget exhausted/);assert.equal(sends,50);
  await budget.close();budget=await investigationBudget(root);assert.equal(budget.ledger.attempts,50);
  budget.startCleanup();await assert.rejects(budget.policy.sendRequest({},send));assert.equal(sends,50);
 }finally{if(budget)await budget.close();await rm(root,{recursive:true,force:true});}
});
