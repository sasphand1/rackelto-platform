require('dotenv').config();
const {getPool}=require('../db');
const {migrate}=require('../ims/migrate');
(async()=>{const pool=getPool();try{await migrate(pool);console.log('IMS core migration complete');}catch(e){console.error(e.code||'UNKNOWN',e.message);process.exitCode=1;}finally{await pool.end();}})();
