require('dotenv').config();
const fs=require('fs');const path=require('path');const mysql=require('mysql2/promise');const bcrypt=require('bcryptjs');
(async()=>{let conn;try{
 const cfg={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,multipleStatements:true};
 conn=await mysql.createConnection(cfg);const db=process.env.DB_NAME||'rackelto';if(!/^[a-zA-Z0-9_]+$/.test(db))throw Error('Invalid database name');
 // CREATE DATABASE can be restricted on Hostinger: create it in hPanel first if permission denied.
 try{await conn.query('CREATE DATABASE IF NOT EXISTS `'+db+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');}catch(e){console.log('Database creation unavailable; expecting pre-created database:',db);}
 await conn.query('USE `'+db+'`');await conn.query(fs.readFileSync(path.join(__dirname,'../db/schema.sql'),'utf8'));
 const email=process.env.ADMIN_EMAIL;const pass=process.env.ADMIN_PASSWORD;
 if(!email||!pass||pass.length<12)throw Error('Set ADMIN_EMAIL and a 12+ character ADMIN_PASSWORD in .env before setup');
 const hash=await bcrypt.hash(pass,12);await conn.execute("INSERT INTO users (email,password_hash,name,role) VALUES (?,?,?,'admin') ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)",[email.toLowerCase(),hash,'Administrator']);
 console.log('Database ready. Admin:',email);}
 catch(e){console.error('Setup failed:',e.message);process.exitCode=1;}finally{if(conn)await conn.end();}})();
