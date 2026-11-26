'use strict';
const {expected}=require('./admin-assets');
const {setTimeout:sleep}=require('node:timers/promises');
const {createHash}=require('node:crypto');
const origin='https://admin.rackeltotechnologies.com';
async function verifyLive({fetcher=fetch,base=origin,records=expected()}={}){
 const headers={'Cache-Control':'no-cache','Pragma':'no-cache'};
 const fetchOne=async p=>{const r=await fetcher(base+p+'?release='+Date.now(),{headers,redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(p+' returned '+r.status);return Buffer.from(await r.arrayBuffer());};
 const html=(await fetchOne('/admin.html')).toString('utf8');
 for(const r of records){if(!html.includes('"/assets/'+r.filename+'"'))throw Error('Live admin HTML does not reference '+r.filename);}
 await Promise.all(records.map(async r=>{const b=await fetchOne('/assets/'+r.filename);if(createHash('sha256').update(b).digest('hex')!==r.hash)throw Error('Live asset checksum mismatch: '+r.filename);}));
 console.log('Production admin HTML and all seven assets match this release.');
}
async function main(){const attempts=process.argv.includes('--retry')?12:1;for(let i=1;i<=attempts;i++){try{await verifyLive();return;}catch(e){console.error('Attempt '+i+'/'+attempts+': '+e.message);if(i===attempts)throw e;await sleep(15000);}}}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={verifyLive};
