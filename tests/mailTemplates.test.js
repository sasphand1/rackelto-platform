'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const t=require('../services/mailTemplates');
test('partner applicant is addressed by name and exact registration type',()=>{for(const type of Object.keys(t.types)){let m=t.application({full_name:'Alex Example',type});assert.match(m.body,/Dear Alex Example/);assert.ok(m.body.includes(t.types[type].toLowerCase()));}});
test('approved pool email contains no guaranteed work',()=>{let m=t.approval({full_name:'Alex Example'});assert.match(m.body,/added to the Rackelto Technologies technical partner pool/);assert.match(m.body,/separate agreement/)});
test('contact gets a short acknowledgement',()=>{let m=t.enquiry({name:'Pat'});assert.match(m.body,/Dear Pat/);assert.match(m.body,/received your enquiry/)});
test('work order includes reference, partner compensation, reply instructions',()=>{let m=t.workOffer({id:14,full_name:'Alex Example',title:'Rack installation',city:'Espoo',country:'Finland',site_address:'Site A',scheduled_at:'2026-10-21 09:00',due_at:'2026-10-21 13:00',description:'Rack and stack',supplier_cost:'150.00',currency:'EUR'});assert.match(m.body,/ACCEPT WO-14/);assert.match(m.body,/DECLINE WO-14/);assert.match(m.body,/150.00 EUR/);assert.ok(!m.body.includes('client_rate'))});

test('application uses correct articles and does not fabricate specialisms',()=>{
  assert.match(t.application({full_name:'Alex',type:'freelancer'}).body,/as an independent engineer/);
  assert.match(t.application({full_name:'Alex',type:'service_company'}).body,/as a technical service company/);
  assert.match(t.application({full_name:'Alex',type:'regional_partner'}).body,/as a regional delivery partner/);
  assert.doesNotMatch(t.application({full_name:'Alex',type:'freelancer'}).body,/Technical specialisms selected:/);
});
test('application lists selected human-facing skills, not only canonical categories',()=>{
  const body=t.application({full_name:'Alex',type:'freelancer',skills:['network'],selected_labels:['Rack and Stack','Wi-Fi Survey','Fiber Optic Installation']}).body;
  assert.match(body,/Technical specialisms selected:\n- Rack and Stack\n- Wi-Fi Survey\n- Fiber Optic Installation/);
  assert.doesNotMatch(body,/\n- network/);
});
test('application falls back to canonical skills when labels not provided',()=>{
  const body=t.application({full_name:'Alex',type:'freelancer',skills:['network','cabling']}).body;
  assert.match(body,/\n- network\n- cabling/);
});
