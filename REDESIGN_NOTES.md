# Rackelto — Editorial Redesign V2

This is a full replacement ZIP of the V1 project, not only a CSS patch. Preserve your local `.env` file; it is intentionally excluded.

## What has changed
- Rebuilt all 12 public pages around a compact, editorial corporate visual system.
- Redesigned service presentation as horizontal capability rows; removed numbered promotional cards and repetitive CTAs.
- Built a detailed, eight-industry capability mapping page.
- Partner page is registration-first with all existing fields and categories and the same backend submission API.
- Contact page has placeholders: `[BUSINESS EMAIL]`, `[REGISTERED ADDRESS]`, `[COMPANY NUMBER]`.
- Underlying Node.js, Express, MariaDB schema, partner management, customer/project/work-order administration and existing API endpoints are preserved.

## Windows VS Code upgrade (your existing database continues)
1. Stop the old app with Ctrl+C.
2. Back up your existing `rackelto-platform` directory and your local `.env` file.
3. Extract this ZIP into a new folder. Copy your original `.env` into the extracted `rackelto-platform` folder.
4. From that folder, execute `npm install` (only needed if dependencies aren't installed) and `npm start`.
5. Open `http://localhost:3000/`, `http://localhost:3000/partner-network.html`, `http://localhost:3000/industries.html`, and `http://localhost:3000/admin.html`.
6. Do not run `npm run db:setup` against an already initialized production-like database unless you have verified the script's behavior and backed up your data. No schema migration is required for this visual redesign.

## Notes
- Company and contact placeholders must be replaced after incorporation.
- Logo is a provisional minimal wordmark/monogram and can be replaced later.
- Google Fonts may require network access; sans-serif fallbacks are included.
- `public/assets/admin.js`, `server.js`, and `db/schema.sql` remain unchanged from V1.
- Requires manual cross-browser/mobile inspection. Node structural tests run with `npm test`; end-to-end database/form tests were not available in the creation environment.
