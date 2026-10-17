# Rackelto Technologies — Integrated Platform (V1)

A **runnable foundation** for the 12-page corporate site, technical-partner registration, business enquiries, private admin, customer registry, projects and dispatch work orders.

## Requirements
- Node.js 20+ (Node 22 recommended)
- MariaDB 10.5+ or compatible MySQL server
- VS Code (optional)

## Windows CMD — local setup

1. Extract the ZIP into a folder, e.g. `C:\projects\rackelto-platform`.
2. Open that folder in VS Code. From **Terminal → New Terminal**, choose Command Prompt.
3. Run:

```cmd
npm install
copy .env.example .env
```

4. Edit `.env`: set database credentials, a random 32+-character `SESSION_SECRET`, `ADMIN_EMAIL`, and a strong unique `ADMIN_PASSWORD`.
5. Start MariaDB locally and create a database or supply a database-enabled account. Run:

```cmd
npm run db:setup
npm start
```

6. Open `http://localhost:3000` for the website, `http://localhost:3000/partner-network.html` for applications, and `http://localhost:3000/admin.html` for administration.

**No database server installed?** You can still inspect and edit all 12 static website pages in VS Code, but registrations, login, projects and other API-driven features require MariaDB. You may configure a dedicated database on Hostinger and deploy there after local development. Do not expose its production credentials in source control.

## 12 public pages
Home, About, Infrastructure Deployment, Hardware Support & Maintenance, Network & Connectivity, Enterprise Workplace Services, Technology Rollouts & IMAC, Retail & Distributed IT, Managed Field Operations, Industries We Serve, Partner Network, Contact & Business Enquiries.

## Operations included
- Public partner applications with 12 technical specializations and optional WhatsApp, LinkedIn, Telegram, other contacts, skills, rate, country/city and GDPR-style consent acknowledgment.
- Public corporate enquiries stored in the database.
- Server-side admin sessions stored in MariaDB; bcrypt password hashes; CSRF protection; authenticated admin operations.
- Partner approvals and internal notes.
- Customer creation/editing.
- Project creation/editing with status, dates, budget, customer association.
- Work-order creation/editing, approved-partner assignment, scheduled tasks, priority, status, site address, completion notes, basic client charge / partner cost.
- Basic audit log, overview metrics, role checks, input schemas, rate limits.

## Hostinger Cloud Startup deployment
Use Hostinger's supported Node.js app deployment with a dedicated MariaDB database, application root and environment variables. Confirm whether Hostinger permits the selected startup command, subdomain routing and Node version in hPanel. The simplest initial production configuration is **one Node.js app** serving the main domain plus `/admin.html` and `/partner-network.html`; later the admin and portal can be routed to dedicated subdomains via supported proxy/rewrite rules. You do **not** need three Node applications to start.

In Hostinger, create a database first, copy its **exact database name and username** (often prefixed), add credentials to the app environment, then run the SQL in `db/schema.sql` and create the first administrator with `node scripts/setup-db.js` if terminal execution is available. If it isn't, import the schema with the provided database management interface and seed the admin securely from an approved setup workflow. Use `NODE_ENV=production`, HTTPS, a strong session secret and configured proxy only after confirming the actual deployment topology.

**Do not redirect the Namecheap DNS until the app is tested**. Keep Arctic Design Studios' files and databases separate.

## Scope limits / before real customer use
This is a substantial initial system, **not audited enterprise production software**. The following must be completed before processing real customer/partner records at scale:
- Verify registration privacy policy, controller identity, legal basis, retention periods, deletion/access procedures and data processing terms.
- Set up monitored backups, restore drills, security updates, vulnerability review, HTTPS configuration, access restrictions, MFA / account recovery and email notification delivery.
- Add contract handling, invoicing/payment reconciliation, uploaded credential validation, staff/user management, document storage and workflow approval gates as required.
- Test end-to-end against your actual Hostinger MariaDB and deployment environment.
- Initial admin is provisioned by .env only at setup. Avoid using the same password in any other system.
- The visual “R” is a provisional typographic logo until the final brand asset is approved.
- No fictional certifications, delivered projects, customer testimonials, global offices or guaranteed SLAs are asserted.

## System layout
```
public/                  12 pages + private admin UI
public/assets/site.js    Public page content / registrations
public/assets/admin.js   Interactive operational dashboard
server.js                Express routes, access control, sessions
 db/schema.sql           MariaDB schema
scripts/setup-db.js      Initial schema + admin setup
.env.example             Required runtime configuration
```
