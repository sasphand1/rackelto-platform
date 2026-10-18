"""Apply the Rackelto mail automation update to the current repository.
Uses strict, single-occurrence guards. Creates timestamped backups of touched files.
Run from the repo root: python scripts/install_email_update.py
"""
from pathlib import Path
from datetime import datetime
import re, shutil, sys
root=Path(__file__).resolve().parents[1]
server=root/'server.js'
admin=root/'public/assets/admin.js'
site=root/'public/assets/site.js'
assert server.is_file() and admin.is_file() and site.is_file(), 'Run installer in the project root after extracting ZIP.'
files={p:p.read_text(encoding='utf-8-sig') for p in (server,admin,site)}
if 'const emailOutbox=require' in files[server]:
    print('Already installed; no files changed.');sys.exit(0)
def replace(p,old,new):
    t=files[p]
    n=t.count(old)
    if n!=1:raise RuntimeError(f'Unexpected source {p.name}: expected one insertion marker, found {n}: {old[:70]}')
    files[p]=t.replace(old,new,1)

def rx(p,pat,new):
    t=files[p]
    t,n=re.subn(pat,lambda m:new,t, count=1,flags=re.S)
    if n!=1:raise RuntimeError(f'Unable to locate the current {p.name} block: {pat}')
    files[p]=t

replace(server,"const {z}=require('zod');const {query,getPool}=require('./db');const app=express();","const {z}=require('zod');const {query,getPool}=require('./db');const emailOutbox=require('./services/emailOutbox');const app=express();")
# Never fail the submission after the database write succeeds, even if the email queue is down.
replace(server,"ok(res,{received:true},201)}));\nconst enquirySchema", "try{await emailOutbox.applicant(r.insertId,{...x,selected_labels:Array.isArray(x.selected_labels)?x.selected_labels:[]})}catch(e){console.error('Application email queue failed:',e.message)}ok(res,{received:true},201)}));\nconst enquirySchema")
# The previous INSERT must capture its insertId; exact insertion guards avoid corrupting other calls.
replace(server,"await query(`INSERT INTO partners(type,full_name,company_name,email,phone,whatsapp,linkedin,telegram,other_contact,country,city,travel_radius_km,skills,languages,experience_years,hourly_rate,currency,availability,notes,consent_at)","const r=await query(`INSERT INTO partners(type,full_name,company_name,email,phone,whatsapp,linkedin,telegram,other_contact,country,city,travel_radius_km,skills,languages,experience_years,hourly_rate,currency,availability,notes,consent_at)")
replace(server,"skills:z.array(z.enum(skillCategories)).min(1).max(12),languages:opt", "skills:z.array(z.enum(skillCategories)).min(1).max(12),selected_labels:z.array(z.string().trim().max(120)).max(25).optional(),languages:opt")
# Keep the selected human-facing role list visible in admin with existing canonical skills mapping.
replace(site,"skills:canonical,notes:details.join('\\n'),availability", "skills:canonical,selected_labels:selectedLabels,notes:details.join('\\n'),availability")
replace(server,"ok(res,{received:true},201)}));\napp.post('/api/auth/login'", "try{await emailOutbox.contact(r.insertId,x)}catch(e){console.error('Enquiry email queue failed:',e.message)}ok(res,{received:true},201)}));\napp.post('/api/auth/login'")
replace(server,"await query('INSERT INTO enquiries(name,company,email,phone,service,message) VALUES(?,?,?,?,?,?)'", "const r=await query('INSERT INTO enquiries(name,company,email,phone,service,message) VALUES(?,?,?,?,?,?)'")
old="await query('UPDATE partners SET status=?,notes=COALESCE(?,notes) WHERE id=?',[x.status,x.notes??null,req.params.id]);await audit(req,'partner',req.params.id,'update_status',x.status);ok(res,{updated:true})"
new="""const before=(await query('SELECT id,status,full_name,email FROM partners WHERE id=?',[req.params.id]))[0];if(!before)return res.status(404).json({error:'Partner not found'});await query('UPDATE partners SET status=?,notes=COALESCE(?,notes) WHERE id=?',[x.status,x.notes??null,req.params.id]);await audit(req,'partner',req.params.id,'update_status',x.status);if(x.status==='approved'&&before.status!=='approved'){try{await emailOutbox.approved(before.id,before)}catch(e){console.error('Approval mail queue failed:',e.message)}}ok(res,{updated:true})"""
replace(server,old,new)
# Guard the work order offer endpoint. It does not approve the assignment; admin confirms acceptance after reading the reply.
marker="app.get('/api/admin/activity',wrap(async(req,res)=>"
block="""app.post('/api/admin/work-orders/:id/offer',roles('admin','manager','dispatcher'),wrap(async(req,res)=>{
  const rows=await query('SELECT w.*,p.currency,pr.full_name,pr.email,pr.status AS partner_status FROM work_orders w JOIN projects p ON p.id=w.project_id LEFT JOIN partners pr ON pr.id=w.partner_id WHERE w.id=?',[req.params.id]);
  if(!rows.length)return res.status(404).json({error:'Work order not found'});const w=rows[0];
  if(!w.partner_id||w.partner_status!=='approved'||!w.email)return res.status(400).json({error:'Select an approved partner with an email first'});
  if(!w.supplier_cost||!w.scheduled_at||!w.description)return res.status(400).json({error:'Complete scope, scheduled date and partner compensation before offering'});
  if(!['open','assigned'].includes(w.status))return res.status(400).json({error:'Work order is not available for offering'});
  await query(\"UPDATE work_orders SET status='assigned' WHERE id=? AND status IN ('open','assigned')\",[w.id]);
  await emailOutbox.offer(w);await audit(req,'work_order',w.id,'offer_sent','Awaiting written reply from partner');ok(res,{queued:true});
}));
app.post('/api/admin/work-orders/:id/confirm-acceptance',roles('admin','manager','dispatcher'),wrap(async(req,res)=>{
  if(req.body?.confirmed!==true)return res.status(400).json({error:'Confirm that the registered partner accepted the specific work order by email'});
  const r=await query(\"UPDATE work_orders SET status='accepted' WHERE id=? AND status='assigned' AND partner_id IS NOT NULL\",[req.params.id]);
  if(r.affectedRows!==1)return res.status(409).json({error:'Only an offered and assigned work order can be confirmed'});
  await audit(req,'work_order',req.params.id,'acceptance_confirmed','Admin verified the engineer email reply');ok(res,{updated:true});
}));
"""
replace(server,marker,block+marker)
replace(server,"const PORT=Number(process.env.PORT)||3000;app.listen(PORT,()=>console.log('Rackelto running: http://localhost:'+PORT));", "const PORT=Number(process.env.PORT)||3000;app.listen(PORT,()=>console.log('Rackelto running: http://localhost:'+PORT));emailOutbox.startWorker();")
# Admin: add explicit buttons on the work-order table, no modification to existing form logic.
# Only the dedicated confirmation action can mark a work order accepted.
replace(server,"const x=schemaValidate(workSchema,req.body);if(x.partner_id){const p=await query(\"SELECT id FROM partners WHERE id=? AND status='approved'\",[x.partner_id]);if(!p.length)return res.status(400).json({error:'Only approved partners may be assigned'});}await query('UPDATE work_orders","const x=schemaValidate(workSchema,req.body);if(x.status==='accepted')return res.status(400).json({error:'Use Confirm Reply after verifying written acceptance'});if(x.partner_id){const p=await query(\"SELECT id FROM partners WHERE id=? AND status='approved'\",[x.partner_id]);if(!p.length)return res.status(400).json({error:'Only approved partners may be assigned'});}await query('UPDATE work_orders")
replace(admin,"const workStatuses=['open','assigned','accepted','in_progress','blocked','completed','cancelled'];","const workStatuses=['open','assigned','in_progress','blocked','completed','cancelled'];")
replace(admin,'<button class="btn small" data-wid="${y.id}">Edit</button></td></tr>', '<button class="btn small" data-wid="${y.id}">Edit</button> ${y.partner_id&&[\'open\',\'assigned\'].includes(y.status)?`<button class="btn small" data-offer="${y.id}">Email Offer</button>`:\'\'} ${y.status===\'assigned\'?`<button class="btn small" data-accept="${y.id}">Confirm Reply</button>`:\'\'}</td></tr>')
replace(admin,"document.querySelector('#add').onclick=()=>{if(!p.length)return toast('Create a project first',true);", """document.querySelectorAll('[data-offer]').forEach(b=>b.onclick=async()=>{if(!confirm('Email this work order offer to the selected engineer?'))return;try{await api('admin/work-orders/'+b.dataset.offer+'/offer','POST',{});toast('Work order offer queued');await load('work-orders')}catch(e){toast(e.message,true)}});
  document.querySelectorAll('[data-accept]').forEach(b=>b.onclick=async()=>{if(!confirm('Have you verified an ACCEPT WO-'+b.dataset.accept+' reply from the assigned engineer?'))return;try{await api('admin/work-orders/'+b.dataset.accept+'/confirm-acceptance','POST',{confirmed:true});toast('Acceptance recorded');await load('work-orders')}catch(e){toast(e.message,true)}});
  document.querySelector('#add').onclick=()=>{if(!p.length)return toast('Create a project first',true);""")
# Strict preflight: do not overwrite if the source does not match expected version.
backup=root/('mail-update-backup-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
backup.mkdir()
for p,t in files.items():
    target=backup/p.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
for p,t in files.items():p.write_text(t,encoding='utf-8')
print('Updated:',', '.join(str(p.relative_to(root)) for p in files))
print('Backups:', backup)
print('Next: install nodemailer; run DB migration; configure Hostinger secrets. Keep MAIL_ENABLED=false until tested.')
