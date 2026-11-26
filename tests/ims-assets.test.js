'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {generate,verify,expected}=require('../scripts/admin-assets');
test('versioned assets are stable across Windows and Linux, and stale bytes fail',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rkl-assets-'));
 try{fs.mkdirSync(path.join(root,'assets'));fs.copyFileSync('public/admin.html',path.join(root,'admin.html'));
 for(const r of expected()){fs.writeFileSync(path.join(root,'assets',r.asset),r.bytes.toString('utf8').replace(/\n/g,'\r\n'));}
 const first=generate(root).map(r=>r.filename);assert.deepEqual(first,expected().map(r=>r.filename));verify(root);
 assert.deepEqual(generate(root).map(r=>r.filename),first);
 fs.appendFileSync(path.join(root,'assets',first[0]),'tampered');assert.throws(()=>verify(root),/Versioned content mismatch/);
 generate(root);verify(root);fs.appendFileSync(path.join(root,'assets','style.css'),'\n/* change */');assert.throws(()=>verify(root),/Missing versioned reference/);
 assert.notEqual(generate(root)[0].filename,first[0]);verify(root);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('production verifier rejects old HTML and altered assets',async()=>{const {verifyLive}=require('../scripts/verify-admin-deployment');const records=expected();const html=fs.readFileSync('public/admin.html');const response=b=>({ok:true,arrayBuffer:async()=>b});const good=async u=>{const p=new URL(u).pathname;return response(p==='/admin.html'?html:records.find(r=>p==='/assets/'+r.filename).bytes);};await verifyLive({fetcher:good,records});await assert.rejects(verifyLive({records,fetcher:async()=>response(Buffer.from('old HTML'))}),/Live admin HTML/);await assert.rejects(verifyLive({records,fetcher:async u=>new URL(u).pathname==='/admin.html'?response(html):response(Buffer.from('old bytes'))}),/checksum mismatch/);});
