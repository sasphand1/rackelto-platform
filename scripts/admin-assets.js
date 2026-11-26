'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assets=['style.css','ims.css','admin.js','ims.js','compliance.js','assurance.js','filing.js'];
const canonical=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const defaultRoot=path.join(__dirname,'..','public');
function expected(root=defaultRoot){return assets.map(asset=>{const bytes=canonical(fs.readFileSync(path.join(root,'assets',asset)));const hash=digest(bytes),ext=path.extname(asset);return {asset,bytes,hash,filename:path.basename(asset,ext)+'.'+hash.slice(0,12)+ext};});}
function generate(root=defaultRoot){const entry=path.join(root,'admin.html');let html=fs.readFileSync(entry,'utf8').replace(/\r\n/g,'\n');const records=expected(root);for(const r of records){const ext=path.extname(r.asset),stem=path.basename(r.asset,ext);const pattern=new RegExp('/assets/'+stem+'(?:\\.[0-9a-f]{12})?\\'+ext+'(?:\\?[^"\\s]*)?(?=")','g');const matches=html.match(pattern)||[];if(matches.length!==1)throw Error('Expected exactly one asset reference: '+r.asset);html=html.replace(pattern,'/assets/'+r.filename);fs.writeFileSync(path.join(root,'assets',r.filename),r.bytes);}fs.writeFileSync(entry,html);verify(root);return records;}
function verify(root=defaultRoot){const html=fs.readFileSync(path.join(root,'admin.html'),'utf8');for(const r of expected(root)){if(!html.includes('"/assets/'+r.filename+'"'))throw Error('Missing versioned reference: '+r.asset);if(!fs.readFileSync(path.join(root,'assets',r.filename)).equals(r.bytes))throw Error('Versioned content mismatch: '+r.asset);}}
if(require.main===module){generate();console.log('Admin assets generated and verified.');}
module.exports={generate,verify,expected,canonical,digest};
