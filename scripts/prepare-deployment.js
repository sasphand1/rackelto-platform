const fs = require('fs');
const path = require('path');

const fromEnv = process.argv[2] === '--from-env';
const role = fromEnv ? process.env.APP_ROLE : process.argv[2];
const dir = path.join(__dirname, '..', 'public');

const allowed = {
  corporate: null,
  partners: ['partner-network.html'],
  admin: ['admin.html']
};

if (fromEnv && !role) {
  console.log('APP_ROLE unavailable during build; no files removed.');
  process.exit(0);
}

if (!Object.hasOwn(allowed, role)) {
  throw new Error('Invalid deployment role: ' + role);
}

if (allowed[role]) {
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.html') && !allowed[role].includes(file)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

console.log('Deployment prepared: ' + role);
