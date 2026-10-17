const fs = require('fs');
const path = require('path');

const role = process.argv[2];
const dir = path.join(__dirname, '..', 'public');

const allowed = {
  corporate: null,
  partners: ['partner-network.html'],
  admin: ['admin.html']
};

if (!Object.hasOwn(allowed, role)) {
  throw new Error(`Invalid deployment role: ${role}`);
}

if (allowed[role]) {
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.html') && !allowed[role].includes(file)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

console.log(`Deployment prepared: ${role}`);
