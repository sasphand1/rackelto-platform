'use strict';
const {fail}=require('./contracts');
const kinds=['context','stakeholder','objective','legal_obligation','risk','supplier_assessment','competency','contract_review','service_verification','complaint','corrective_action','environmental_aspect','waste','emissions','safety','security_asset','access_review','incident','privacy','retention','vulnerability','continuity','ethics','esg','ai_governance','policy_review','customer_requirement'];
const frameworks=['ISO 9001','ISO 14001','ISO 27001','ISO 45001','ISO 22301','ISO 20000-1','ISO 42001','ISO 20400','ISO 31000','ISO 37301','ISO 37001','NIST CSF','GDPR','NIS2','RBA','GHG Protocol','Dell','Other'];
function assess(status,note,evidence){if(['implemented','verified','not_applicable'].includes(status)&&!String(note||'').trim())fail('Assessment justification required');if(['implemented','verified'].includes(status)&&!evidence)fail('Approved evidence required');}
function close(status,note,evidence){if(status==='closed'&&(!String(note||'').trim()||!evidence))fail('Closure requires a note and approved evidence');}
module.exports={kinds,frameworks,assess,close};
