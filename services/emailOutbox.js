'use strict';
const crypto=require('crypto');
const {query}=require('../db');
const templates=require('./mailTemplates');
const sender=process.env.MAIL_FROM||'info@rackeltotechnologies.com';
const internal=()=>[...new Set((process.env.MAIL_NOTIFY_TO||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))].slice(0,4);
async function queue(key,recipient,message,replyTo){
  if(!recipient||!message?.subject||!message?.body)return;
  await query('INSERT IGNORE INTO email_outbox(event_key,recipient,subject,body,reply_to) VALUES(?,?,?,?,?)',[key,recipient,message.subject,message.body,replyTo||sender]);
}
async function queueNotice(kind,id,summary){let emails=internal();for(const email of emails)await queue(`internal:${kind}:${id}:${email}`,email,templates.notification(`${kind} #${id}`,summary),sender)}
async function applicant(id,p){await queue(`application:${id}`,p.email,templates.application(p));await queueNotice('New partner application',id,{Name:p.full_name,Type:templates.types[p.type]||p.type,Email:p.email,Location:`${p.city}, ${p.country}`,Skills:(p.selected_labels||p.skills||[]).join(', ')})}
async function approved(id,p){await queue(`approval:${id}`,p.email,templates.approval(p));await queueNotice('Partner approved',id,{Name:p.full_name,Email:p.email})}
async function contact(id,e){await queue(`enquiry:${id}`,e.email,templates.enquiry(e));await queueNotice('New contact enquiry',id,{Name:e.name,Email:e.email,Company:e.company||'',Service:e.service||'',Message:e.message||''})}
async function offer(w){const signature=crypto.createHash('sha256').update(JSON.stringify([w.partner_id,w.title,w.description,w.site_address,w.city,w.country,w.scheduled_at,w.due_at,w.supplier_cost,w.currency])).digest('hex').slice(0,18);await queue(`offer:${w.id}:${signature}`,w.email,templates.workOffer(w));await queueNotice('Work order offered',`${w.id}:${signature}`,{Reference:`WO-${w.id}`,Engineer:w.full_name,Email:w.email,Assignment:w.title})}
function startWorker(){if(process.env.APP_ROLE!=='admin'||process.env.MAIL_ENABLED!=='true')return; if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASSWORD){console.error('Mail worker disabled: missing SMTP config');return;}
  let nodemailer;try{nodemailer=require('nodemailer')}catch(e){console.error('Install nodemailer to enable mail worker');return}
  const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
  let running=false;
  async function tick(){if(running)return;running=true;try{
    await query("UPDATE email_outbox SET status='pending' WHERE status='sending' AND claimed_at<DATE_SUB(NOW(),INTERVAL 15 MINUTE)");
    const rows=await query("SELECT id FROM email_outbox WHERE status IN ('pending','failed') AND next_attempt_at<=NOW() AND attempts<5 ORDER BY id LIMIT 8");
    for(const item of rows){const lock=await query("UPDATE email_outbox SET status='sending',attempts=attempts+1,claimed_at=NOW() WHERE id=? AND status IN ('pending','failed') AND next_attempt_at<=NOW() AND attempts<5",[item.id]);if(lock.affectedRows!==1)continue;const row=(await query('SELECT * FROM email_outbox WHERE id=?',[item.id]))[0];try{await transporter.sendMail({from:`Rackelto Technologies <${sender}>`,to:row.recipient,replyTo:row.reply_to||sender,subject:row.subject,text:row.body});await query("UPDATE email_outbox SET status='sent',sent_at=NOW(),last_error=NULL WHERE id=?",[row.id]);}catch(err){await query("UPDATE email_outbox SET status='failed',last_error=?,next_attempt_at=DATE_ADD(NOW(),INTERVAL ? MINUTE) WHERE id=?",[String(err.message||err).slice(0,500),Math.min(60,2**row.attempts),row.id]);console.error('Email delivery failed',row.id,err.message)}}
  }catch(err){console.error('Email worker error:',err.message)}finally{running=false}}
  const timer=setInterval(tick,30000);timer.unref?.();setTimeout(tick,4000);
}
module.exports={applicant,approved,contact,offer,startWorker};
