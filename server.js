require('dotenv').config();
const express=require('express'),helmet=require('helmet'),rateLimit=require('express-rate-limit'),session=require('express-session'),bcrypt=require('bcryptjs'),crypto=require('crypto'),path=require('path');
const {z}=require('zod');const {query,getPool}=require('./db');const app=express();
if(process.env.NODE_ENV==='production' && (!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw Error('Set a strong SESSION_SECRET');
app.disable('x-powered-by');if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],fontSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:process.env.NODE_ENV==='production'?[]:null}}}));
app.use(express.json({limit:'100kb'}));app.use(express.urlencoded({extended:false,limit:'100kb'}));
class DbSessionStore extends session.Store {get(sid,cb){query('SELECT session_json FROM sessions WHERE sid=? AND expires_at>NOW()',[sid]).then(r=>{if(!r.length)return cb(null,null);try{cb(null,JSON.parse(r[0].session_json));}catch(e){cb(e);}}).catch(cb);}set(sid,s,cb){let expiry=s.cookie?.expires?new Date(s.cookie.expires):new Date(Date.now()+8*3600e3);query('INSERT INTO sessions(sid,expires_at,session_json) VALUES(?,?,?) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at),session_json=VALUES(session_json)',[sid,expiry,JSON.stringify(s)]).then(()=>cb?.()).catch(e=>cb?.(e));}destroy(sid,cb){query('DELETE FROM sessions WHERE sid=?',[sid]).then(()=>cb?.()).catch(e=>cb?.(e));}touch(sid,s,cb){let expiry=s.cookie?.expires?new Date(s.cookie.expires):new Date(Date.now()+8*3600e3);query('UPDATE sessions SET expires_at=? WHERE sid=?',[expiry,sid]).then(()=>cb?.()).catch(e=>cb?.(e));}}
app.use(session({name:'rackelto.sid',store:new DbSessionStore(),secret:process.env.SESSION_SECRET||'dev-only-secret-change-before-public-deployment',resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:8*3600*1000}}));
const limiter=rateLimit({windowMs:15*60*1000,limit:80,standardHeaders:'draft-7',legacyHeaders:false});
app.use('/api/public',limiter);app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:'draft-7',legacyHeaders:false}));
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const ok=(res,data,status=200)=>res.status(status).json({ok:true,data});
const required=(req,res,next)=>req.session.user?next():res.status(401).json({error:'Login required'});
const roles=(...allowed)=>(req,res,next)=>allowed.includes(req.session.user.role)?next():res.status(403).json({error:'Insufficient permissions'});
const schemaValidate=(schema,body)=>{const result=schema.safeParse(body);if(!result.success){const e=new Error(result.error.issues.map(x=>x.path.join('.')+': '+x.message).join('; '));e.status=400;throw e;}return result.data;};
const ss=z.string().trim(),opt=z.union([ss,z.literal(''),z.null()]).optional(),email=z.string().trim().email().max(254),str=(len)=>ss.min(1).max(len);
const skillCategories=['Data Center Engineers','Hardware Break-Fix Technicians','Network Engineers','Fiber & Structured Cabling Technicians','Desktop / EUC Engineers','Retail IT & POS Technicians','IT Rollout & IMAC Technicians','Wireless & Telecom Engineers','IT Asset & Decommissioning Specialists','Server & Storage Specialists','IT Infrastructure Project Managers','Field Service Coordinators'];
/* Rackelto hostname routing */
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  const route = req.path;

  const isPartners = host === 'partners.rackeltotechnologies.com';
  const isAdmin = host === 'admin.rackeltotechnologies.com';

  // Keep the corporate website unchanged.
  if (!isPartners && !isAdmin) return next();

  // Shared static files and health endpoint.
  if (
    route.startsWith('/assets/') ||
    route === '/favicon.ico' ||
    route === '/api/health'
  ) return next();

  if (isPartners) {
    if (route === '/') return res.redirect(302, '/partner-network.html');

    if (
      route === '/partners' ||
      route === '/partner-network.html' ||
      route.startsWith('/api/public/') ||
      route === '/api/auth/csrf'
    ) return next();

    return res.status(404).send('Not found');
  }

  if (isAdmin) {
    if (route === '/') return res.redirect(302, '/admin.html');

    if (
      route === '/admin' ||
      route === '/admin.html' ||
      route.startsWith('/api/auth/') ||
      route.startsWith('/api/admin/')
    ) return next();

    return res.status(404).send('Not found');
  }

  next();
});
app.get('/api/public/categories',(_req,res)=>ok(res,skillCategories));
app.get('/api/health',wrap(async(_req,res)=>{await query('SELECT 1 AS value');ok(res,{status:'healthy'})}));
app.get('/api/auth/csrf', (req,res)=>{if(!req.session.csrf)req.session.csrf=crypto.randomBytes(32).toString('hex');ok(res,{token:req.session.csrf});});
app.use('/api', (req,res,next)=>{if(['GET','HEAD','OPTIONS'].includes(req.method))return next();const provided=req.get('X-CSRF-Token');if(!req.session.csrf||!provided||provided!==req.session.csrf)return res.status(403).json({error:'Invalid CSRF token. Refresh and try again.'});next();});
const partnerSchema=z.object({type:z.enum(['freelancer','service_company','regional_partner']),full_name:str(160),company_name:opt,email,phone:opt,whatsapp:opt,linkedin:opt,telegram:opt,other_contact:opt,country:str(100),city:str(140),travel_radius_km:z.coerce.number().int().min(0).max(10000).nullable().optional(),skills:z.array(z.enum(skillCategories)).min(1).max(12),languages:opt,experience_years:z.coerce.number().int().min(0).max(80).nullable().optional(),hourly_rate:z.coerce.number().min(0).max(100000).nullable().optional(),currency:z.enum(['EUR','GBP','USD','SEK','NOK','DKK','CHF']).default('EUR'),availability:opt,notes:opt,consent:z.literal(true),website:z.string().optional()});
app.post('/api/public/partners',wrap(async(req,res)=>{const x=schemaValidate(partnerSchema,req.body);if(x.website)return ok(res,{received:true},202);await query(`INSERT INTO partners(type,full_name,company_name,email,phone,whatsapp,linkedin,telegram,other_contact,country,city,travel_radius_km,skills,languages,experience_years,hourly_rate,currency,availability,notes,consent_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,[x.type,x.full_name,x.company_name||null,x.email,x.phone||null,x.whatsapp||null,x.linkedin||null,x.telegram||null,x.other_contact||null,x.country,x.city,x.travel_radius_km??null,JSON.stringify(x.skills),x.languages||null,x.experience_years??null,x.hourly_rate??null,x.currency,x.availability||null,x.notes||null]);ok(res,{received:true},201)}));
const enquirySchema=z.object({name:str(160),company:opt,email,phone:opt,service:opt,message:str(5000),website:z.string().optional()});
app.post('/api/public/enquiries',wrap(async(req,res)=>{const x=schemaValidate(enquirySchema,req.body);if(x.website)return ok(res,{received:true},202);await query('INSERT INTO enquiries(name,company,email,phone,service,message) VALUES(?,?,?,?,?,?)',[x.name,x.company||null,x.email,x.phone||null,x.service||null,x.message]);ok(res,{received:true},201)}));
app.post('/api/auth/login',wrap(async(req,res)=>{const {email:mail,password}=schemaValidate(z.object({email,password:z.string().min(1).max(300)}),req.body);const rows=await query('SELECT id,email,name,role,password_hash,is_active FROM users WHERE email=?',[mail.toLowerCase()]);if(!rows.length||!rows[0].is_active||!(await bcrypt.compare(password,rows[0].password_hash)))return res.status(401).json({error:'Invalid credentials'});req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Session failure'});req.session.user={id:rows[0].id,email:rows[0].email,name:rows[0].name,role:rows[0].role};req.session.csrf=crypto.randomBytes(32).toString('hex');ok(res,{user:req.session.user,csrf:req.session.csrf});});}));
app.post('/api/auth/logout',required,(req,res)=>req.session.destroy(()=>{res.clearCookie('rackelto.sid');ok(res,{loggedOut:true})}));
app.get('/api/auth/me',(req,res)=>ok(res,{user:req.session.user||null,csrf:req.session.csrf||null}));
const audit=async(req,entity,id,action,detail='')=>{await query('INSERT INTO activity_log(actor_user_id,entity_type,entity_id,action,detail) VALUES(?,?,?,?,?)',[req.session.user.id,entity,id,action,detail]);};
app.use('/api/admin',required);
const paging=req=>({limit:Math.min(Math.max(parseInt(req.query.limit,10)||30,1),100),offset:Math.max(parseInt(req.query.offset,10)||0,0)});
app.get('/api/admin/overview',wrap(async(req,res)=>{const [p,c,proj,w,enq,activity]=await Promise.all([query('SELECT status,COUNT(*) AS n FROM partners GROUP BY status'),query('SELECT COUNT(*) AS n FROM customers'),query('SELECT status,COUNT(*) AS n FROM projects GROUP BY status'),query('SELECT status,COUNT(*) AS n FROM work_orders GROUP BY status'),query("SELECT COUNT(*) AS n FROM enquiries WHERE status='new'"),query('SELECT entity_type,entity_id,action,created_at FROM activity_log ORDER BY id DESC LIMIT 12')]);ok(res,{partners:p,customers:c[0].n,projects:proj,work_orders:w,new_enquiries:enq[0].n,activity})}));
app.get('/api/admin/partners',wrap(async(req,res)=>{const {limit,offset}=paging(req);const clauses=[],vals=[];if(req.query.status){clauses.push('status=?');vals.push(req.query.status)}if(req.query.country){clauses.push('country=?');vals.push(req.query.country)}if(req.query.q){clauses.push('(full_name LIKE ? OR city LIKE ? OR email LIKE ? OR company_name LIKE ?)');const q='%'+req.query.q.slice(0,80)+'%';vals.push(q,q,q,q)}if(req.query.skill){clauses.push('JSON_CONTAINS(skills,JSON_QUOTE(?))');vals.push(req.query.skill)}const where=clauses.length?' WHERE '+clauses.join(' AND '):'';const rows=await query('SELECT * FROM partners'+where+' ORDER BY id DESC LIMIT '+limit+' OFFSET '+offset,vals);ok(res,rows.map(r=>({...r,skills:typeof r.skills==='string'?JSON.parse(r.skills):r.skills})))}));
app.patch('/api/admin/partners/:id',roles('admin','manager'),wrap(async(req,res)=>{const x=schemaValidate(z.object({status:z.enum(['applied','screening','verified','approved','inactive','rejected']),notes:z.string().max(5000).optional()}),req.body);await query('UPDATE partners SET status=?,notes=COALESCE(?,notes) WHERE id=?',[x.status,x.notes??null,req.params.id]);await audit(req,'partner',req.params.id,'update_status',x.status);ok(res,{updated:true})}));
app.get('/api/admin/enquiries',wrap(async(req,res)=>{const {limit,offset}=paging(req);ok(res,await query('SELECT * FROM enquiries ORDER BY id DESC LIMIT '+limit+' OFFSET '+offset))}));
app.patch('/api/admin/enquiries/:id',roles('admin','manager'),wrap(async(req,res)=>{const x=schemaValidate(z.object({status:z.enum(['new','contacted','qualified','closed'])}),req.body);await query('UPDATE enquiries SET status=? WHERE id=?',[x.status,req.params.id]);await audit(req,'enquiry',req.params.id,'update_status',x.status);ok(res,{updated:true})}));
const customerSchema=z.object({name:str(180),contact_name:opt,email:opt,phone:opt,country:opt,notes:opt});
app.get('/api/admin/customers',wrap(async(req,res)=>ok(res,await query('SELECT * FROM customers ORDER BY id DESC LIMIT 500'))));
app.post('/api/admin/customers',roles('admin','manager'),wrap(async(req,res)=>{const x=schemaValidate(customerSchema,req.body);const r=await query('INSERT INTO customers(name,contact_name,email,phone,country,notes) VALUES(?,?,?,?,?,?)',[x.name,x.contact_name||null,x.email||null,x.phone||null,x.country||null,x.notes||null]);await audit(req,'customer',r.insertId,'create');ok(res,{id:r.insertId},201)}));
app.patch('/api/admin/customers/:id',roles('admin','manager'),wrap(async(req,res)=>{const x=schemaValidate(customerSchema,req.body);await query('UPDATE customers SET name=?,contact_name=?,email=?,phone=?,country=?,notes=? WHERE id=?',[x.name,x.contact_name||null,x.email||null,x.phone||null,x.country||null,x.notes||null,req.params.id]);await audit(req,'customer',req.params.id,'update');ok(res,{updated:true})}));
const dateField=z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/),z.literal(''),z.null()]).optional();
const projectSchema=z.object({customer_id:z.coerce.number().int().positive(),name:str(180),description:opt,country:opt,city:opt,starts_on:dateField,due_on:dateField,status:z.enum(['planned','active','on_hold','completed','cancelled']).default('planned'),budget:z.coerce.number().min(0).max(1e12).nullable().optional(),currency:z.enum(['EUR','GBP','USD','SEK','NOK','DKK','CHF']).default('EUR')});
app.get('/api/admin/projects',wrap(async(req,res)=>ok(res,await query('SELECT p.*,c.name AS customer_name,(SELECT COUNT(*) FROM work_orders w WHERE w.project_id=p.id) AS work_order_count FROM projects p JOIN customers c ON c.id=p.customer_id ORDER BY p.id DESC LIMIT 500'))));
app.post('/api/admin/projects',roles('admin','manager'),wrap(async(req,res)=>{const x=schemaValidate(projectSchema,req.body);const r=await query('INSERT INTO projects(customer_id,name,description,country,city,starts_on,due_on,status,budget,currency) VALUES(?,?,?,?,?,?,?,?,?,?)',[x.customer_id,x.name,x.description||null,x.country||null,x.city||null,x.starts_on||null,x.due_on||null,x.status,x.budget??null,x.currency]);await audit(req,'project',r.insertId,'create');ok(res,{id:r.insertId},201)}));
app.patch('/api/admin/projects/:id',roles('admin','manager'),wrap(async(req,res)=>{const x=schemaValidate(projectSchema,req.body);await query('UPDATE projects SET customer_id=?,name=?,description=?,country=?,city=?,starts_on=?,due_on=?,status=?,budget=?,currency=? WHERE id=?',[x.customer_id,x.name,x.description||null,x.country||null,x.city||null,x.starts_on||null,x.due_on||null,x.status,x.budget??null,x.currency,req.params.id]);await audit(req,'project',req.params.id,'update');ok(res,{updated:true})}));
const dt=z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),z.literal(''),z.null()]).optional();
const workSchema=z.object({project_id:z.coerce.number().int().positive(),title:str(180),description:opt,site_address:opt,city:opt,country:opt,scheduled_at:dt,due_at:dt,priority:z.enum(['low','normal','high','urgent']).default('normal'),status:z.enum(['open','assigned','accepted','in_progress','blocked','completed','cancelled']).default('open'),partner_id:z.coerce.number().int().positive().nullable().optional(),client_rate:z.coerce.number().min(0).max(1e10).nullable().optional(),supplier_cost:z.coerce.number().min(0).max(1e10).nullable().optional(),completion_notes:opt});
const sqlDate=v=>v?v.replace('T',' ')+':00':null;
app.get('/api/admin/work-orders',wrap(async(req,res)=>{let sql='SELECT w.*,p.name AS project_name,pr.full_name AS partner_name FROM work_orders w JOIN projects p ON p.id=w.project_id LEFT JOIN partners pr ON pr.id=w.partner_id';let args=[];if(req.query.project_id){sql+=' WHERE w.project_id=?';args.push(req.query.project_id)}sql+=' ORDER BY w.id DESC LIMIT 500';ok(res,await query(sql,args))}));
app.post('/api/admin/work-orders',roles('admin','manager','dispatcher'),wrap(async(req,res)=>{const x=schemaValidate(workSchema,req.body);if(x.partner_id){const p=await query("SELECT id FROM partners WHERE id=? AND status='approved'",[x.partner_id]);if(!p.length)return res.status(400).json({error:'Only approved partners may be assigned'});}const r=await query('INSERT INTO work_orders(project_id,title,description,site_address,city,country,scheduled_at,due_at,priority,status,partner_id,client_rate,supplier_cost,completion_notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[x.project_id,x.title,x.description||null,x.site_address||null,x.city||null,x.country||null,sqlDate(x.scheduled_at),sqlDate(x.due_at),x.priority,x.status,x.partner_id??null,x.client_rate??null,x.supplier_cost??null,x.completion_notes||null]);await audit(req,'work_order',r.insertId,'create');ok(res,{id:r.insertId},201)}));
app.patch('/api/admin/work-orders/:id',roles('admin','manager','dispatcher'),wrap(async(req,res)=>{const x=schemaValidate(workSchema,req.body);if(x.partner_id){const p=await query("SELECT id FROM partners WHERE id=? AND status='approved'",[x.partner_id]);if(!p.length)return res.status(400).json({error:'Only approved partners may be assigned'});}await query('UPDATE work_orders SET project_id=?,title=?,description=?,site_address=?,city=?,country=?,scheduled_at=?,due_at=?,priority=?,status=?,partner_id=?,client_rate=?,supplier_cost=?,completion_notes=?,completed_at=IF(?="completed",COALESCE(completed_at,NOW()),NULL) WHERE id=?',[x.project_id,x.title,x.description||null,x.site_address||null,x.city||null,x.country||null,sqlDate(x.scheduled_at),sqlDate(x.due_at),x.priority,x.status,x.partner_id??null,x.client_rate??null,x.supplier_cost??null,x.completion_notes||null,x.status,req.params.id]);await audit(req,'work_order',req.params.id,'update',x.status);ok(res,{updated:true})}));
app.get('/api/admin/activity',wrap(async(req,res)=>ok(res,await query('SELECT a.*,u.name AS actor_name FROM activity_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 100'))));
app.get('/partners', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'partner-network.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.use(express.static(path.join(__dirname,'public'),{extensions:['html'],index:'index.html',dotfiles:'deny'}));
app.use('/api',(req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res,next)=>{console.error(err);res.status(err.status||((err.code==='ER_NO_REFERENCED_ROW_2'||err.code==='ER_DUP_ENTRY')?400:500)).json({error:(err.status||err.code==='ER_NO_REFERENCED_ROW_2'||err.code==='ER_DUP_ENTRY')?err.message:'The request could not be completed'})});
const PORT=Number(process.env.PORT)||3000;app.listen(PORT,()=>console.log('Rackelto running: http://localhost:'+PORT));module.exports={app,skillCategories};

