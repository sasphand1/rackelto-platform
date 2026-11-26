const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {migrate,readiness}=require('../ims/migrate');
function mock({existing=false,deny=false,lock=true}={}){
 const calls=[];let tables=existing?3:0;let releases=0;
 const c={async query(sql){calls.push(sql);if(sql.includes('GET_LOCK'))return [[{acquired:lock?1:0}]];if(sql.includes('RELEASE_LOCK'))return [[{}]];if(sql.startsWith('CREATE TABLE')){if(deny)throw Object.assign(Error('denied'),{code:'ER_TABLEACCESS_DENIED_ERROR'});tables++;return [[]];}if(tables<3)throw Object.assign(Error('missing'),{code:'ER_NO_SUCH_TABLE'});return [[]];},release(){releases++;}};
 return {pool:{async getConnection(){return c;}},calls,releases:()=>releases};
}
test('fresh IMS schema is created and verified, with migration lock released',async()=>{const m=mock();await migrate(m.pool);assert.equal(m.calls.filter(s=>s.startsWith('CREATE TABLE')).length,3);assert.ok(m.calls.at(-1).includes('RELEASE_LOCK'));assert.equal(m.releases(),1);});
test('existing schema needs no DDL or lock',async()=>{const m=mock({existing:true});await migrate(m.pool);assert.equal(m.calls.length,3);assert.equal(m.releases(),1);});
test('DDL permission failure does not report ready and releases lock',async()=>{const m=mock({deny:true});const r=readiness(m.pool,{info(){},error(){}});assert.equal(await r.ensure(),false);assert.ok(m.calls.at(-1).includes('RELEASE_LOCK'));assert.equal(m.releases(),1);const n=m.calls.length;assert.equal(await r.ensure(),false);assert.equal(m.calls.length,n);});
test('concurrent readiness requests share initialization',async()=>{const m=mock();const r=readiness(m.pool,{info(){},error(){}});assert.deepEqual(await Promise.all([r.ensure(),r.ensure()]),[true,true]);assert.equal(m.releases(),1);});
test('lock failure prevents DDL',async()=>{const m=mock({lock:false});await assert.rejects(migrate(m.pool),{code:'IMS_LOCK'});assert.equal(m.calls.filter(s=>s.startsWith('CREATE TABLE')).length,0);assert.equal(m.releases(),1);});
test('admin startup and protected IMS routes use schema readiness',()=>{const s=fs.readFileSync('server.js','utf8');assert.match(s,/if\(\(process.env.APP_ROLE\|\|'corporate'\)==='admin'\)void imsReadiness.ensure\(\)/);assert.match(s,/roles\('admin','manager'\),wrap\(async\(req,res,next\)=>\{if\(!await imsReadiness.ensure\(\)\)return res.status\(503\)/);});
