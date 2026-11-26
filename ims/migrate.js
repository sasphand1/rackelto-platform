'use strict';
const fs = require('node:fs');
const path = require('node:path');
const statements = fs.readFileSync(path.join(__dirname,'../db/migrations/003_ims_core.sql'),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
const probes = [
  'SELECT id,code,title,category,owner_id,created_at FROM ims_documents LIMIT 0',
  'SELECT id,document_id,revision,filename,media_type,content,sha256,bytes,status,created_by,reviewed_by,review_note,review_due,reviewed_at,created_at FROM ims_document_versions LIMIT 0',
  'SELECT id,actor_id,event_type,entity_id,detail,created_at FROM ims_events LIMIT 0'
];
async function verify(c){for(const sql of probes) await c.query(sql);}
async function migrate(pool){
 const c=await pool.getConnection();let locked=false;
 try {
  try {await verify(c);return;} catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;}
  const [[row]]=await c.query("SELECT GET_LOCK(CONCAT('rkl-ims-', SHA2(DATABASE(),224)), 15) AS acquired");
  if(Number(row.acquired)!==1)throw Object.assign(new Error('IMS migration lock unavailable'),{code:'IMS_LOCK'});
  locked=true;
  try {await verify(c);return;} catch(e){if(e.code!=='ER_NO_SUCH_TABLE')throw e;}
  for(const sql of statements)await c.query(sql);
  await verify(c);
 } finally {
  try {if(locked)await c.query("SELECT RELEASE_LOCK(CONCAT('rkl-ims-', SHA2(DATABASE(),224)))");} finally {c.release();}
 }
}
function readiness(pool,log=console){
 let ready=false,pending=null,lastAttempt=0;
 function ensure(){
  if(ready)return Promise.resolve(true);
  if(pending)return pending;
  if(lastAttempt && Date.now()-lastAttempt<30000)return Promise.resolve(false);
  lastAttempt=Date.now();
  pending=Promise.resolve().then(()=>migrate(pool)).then(()=>{ready=true;log.info('IMS schema ready');return true;}).catch(e=>{log.error('IMS schema initialization failed:',e.code||'UNKNOWN');return false;}).finally(()=>{pending=null;});
  return pending;
 }
 return {ensure};
}
module.exports={migrate,readiness};
