import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';

// Keep the existing hash format and work factor; move CPU work off the event
// loop. Bound both running native jobs and waiting requests per process.
const concurrency=4,queueLimit=128,queue=[];
let active=0;
async function derive(value,salt) {
  if(active>=concurrency) {
    if(queue.length>=queueLimit)throw Error('Password service busy');
    await new Promise(resolve=>queue.push(resolve));
  } else active++;
  try {
    return await new Promise((resolve,reject)=>scrypt(value,salt,32,{N:16384,r:8,p:1},(error,key)=>error?reject(error):resolve(key)));
  } finally {const next=queue.shift();if(next)next();else active--;}
}
export async function password(value) {
  const salt=randomBytes(16).toString('hex');
  return salt+':'+(await derive(value,salt)).toString('hex');
}
export async function verify(value,stored) {
  if(typeof value!=='string' || value.length>128 || typeof stored!=='string' || !/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored))return false;
  const [salt,key]=stored.split(':');
  return timingSafeEqual(await derive(value,salt),Buffer.from(key,'hex'));
}
