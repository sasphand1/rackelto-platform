require('dotenv').config();
const mysql=require('mysql2/promise');
let pool;
function getPool(){ if(!pool) pool=mysql.createPool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:8,decimalNumbers:true,dateStrings:true,ssl:process.env.DB_SSL==='true'?{}:undefined});return pool;}
const query=async(sql,params=[])=>{const [rows]=await getPool().execute(sql,params);return rows;};
module.exports={getPool,query};
