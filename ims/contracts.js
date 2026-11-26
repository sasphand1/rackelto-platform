'use strict';
const crypto=require('node:crypto');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const MAX=5*1024*1024;
const types={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain'};
function payload(filename,base64){
 if(typeof filename!=='string'||!/^[-\w .()]{1,180}\.(pdf|docx|xlsx|txt)$/i.test(filename))fail('Use a PDF, DOCX, XLSX or TXT filename');
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX/3)*4||base64.length%4!==0||! /^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail('Invalid file or file exceeds 5 MiB');
 const content=Buffer.from(base64,'base64'); if(content.toString('base64')!==base64||!content.length||content.length>MAX)fail('Invalid file size');
 const ext=filename.split('.').pop().toLowerCase();
 if(ext==='pdf'&&!content.subarray(0,5).equals(Buffer.from('%PDF-')))fail('Invalid PDF signature');
 if(['docx','xlsx'].includes(ext)&&!content.subarray(0,4).equals(Buffer.from([80,75,3,4])))fail('Invalid Office archive signature');
 return {filename,content,media_type:types[ext],bytes:content.length,sha256:crypto.createHash('sha256').update(content).digest('hex')};
}
function transition(status,action){const next={draft:{submit:'review'},review:{approve:'approved',reject:'rejected'}}[status]?.[action];if(!next)fail('Invalid document transition',409);return next;}
module.exports={payload,transition,fail,MAX};
