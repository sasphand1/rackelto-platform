const fs = require('fs');
const path = require('path');

const role = process.env.APP_ROLE || 'corporate';
const publicDir = path.join(__dirname, '..', 'public');

const allowed = {
  partners: ['partner-network.html'],
  admin: ['admin.html']
};

if (allowed[role]) {
  for (const file of fs.readdirSync(publicDir)) {
    if (file.endsWith('.html') && !allowed[role].includes(file)) {
      fs.unlinkSync(path.join(publicDir, file));
    }
  }
  console.log(`Prepared ${role} deployment`);
} else {
  console.log('Corporate deployment: all pages retained');
}
