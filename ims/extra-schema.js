'use strict';
const fs=require('node:fs'),path=require('node:path');
function extraSchema(pool,file){let ready=false,pending;return async function ensure(){if(ready)return;if(pending)return pending;pending=(async()=>{const c=await pool().getConnection();try{for(const sql of fs.readFileSync(path.join(__dirname,'../db/migrations',file),'utf8').split(';').map(s=>s.trim()).filter(Boolean))await c.query(sql);ready=true;}finally{c.release();}})();try{await pending;}finally{pending=null;}};}
module.exports={extraSchema};
