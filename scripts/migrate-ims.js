require('dotenv').config();
const fs=require('node:fs');const path=require('node:path');const {getPool}=require('../db');
(async()=>{const pool=getPool();try{const sql=fs.readFileSync(path.join(__dirname,'../db/migrations/003_ims_core.sql'),'utf8');for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await pool.query(statement);console.log('IMS core migration complete');}catch(e){console.error(e.message);process.exitCode=1;}finally{await pool.end();}})();
