'use strict';
function access(folders,grants,user,folderId,write=false){const seen=new Set();let key=String(folderId);while(key){if(seen.has(key))return false;seen.add(key);const f=folders.find(x=>String(x.id)===key);if(!f)return false;if(user.role!=='admin'&&Number(f.restricted)){const g=grants.find(x=>String(x.folder_id)===key&&String(x.user_id)===String(user.id));if(!g||(write&&g.permission!=='write'))return false;}key=f.parent_id==null?'':String(f.parent_id);}return ['admin','manager'].includes(user.role);}
module.exports={access};
