# Rackelto integrated management platform — implementation baseline

## Architecture
One existing Express backend, MySQL business database and separately exposed corporate, partner and admin interfaces. Keep same-origin admin sessions, CSRF and role checks. Do not migrate the production database or introduce a new subscription without a measured need. The existing partner interface is an application form, not an authenticated technician workspace. Existing offer/acceptance is administered via email. Future portals must be built with explicit account provisioning, customer isolation and permissions.

## Delivery boundaries
| Area | A — core | B — compliance | C — assurance |
|---|---|---|---|
| Operational management | Existing partners, enquiries, customers, projects, work orders, email | Qualification, SLA, safety, subcontracting and closure controls | Evidence mapping and performance review |
| Document control | Register, upload, download, revision, review, release, hash, events | Policy ownership, scheduled review and mandatory acknowledgement | Evidence index, export and integrity verification |
| Governance | Admin workspace, role revalidation | Context, interested parties, roles, objectives, requirements register, legal obligations | Management review and internal audit |
| Quality | Controlled documentation | Contract review, supplier assessment, competence, service verification, complaints, CAPA | Quality indicators and audit sampling |
| Environment | Document category | Aspects and impacts, obligations, waste, travel, emergency preparedness, objectives | Environmental performance and compliance evidence |
| Security and privacy | Existing sessions, CSRF, restricted document routes | Asset register, access reviews, incidents, privacy, data retention, vulnerability tracking, continuity | Security evidence, recovery test reporting |
| Safety and ethics | Document categories | Site risk assessment, worker safety, anti-bribery, conflicts, labour due diligence, ESG | Evidence and exceptions |
| Future assurance | No certification claims | Configurable references to ISO 27001, 45001, 22301, 20000-1, 42001, 20400, 31000, 37301, 37001, NIST CSF, applicable GDPR/NIS2, RBA and customer requirements | Framework-specific packages, gaps, temporary auditor access |

## Required policies and procedures (draft inventory, not adopted)
Corporate scope and responsibilities; quality policy; environmental policy; information security and privacy policy; incident response and notification; access and identity management; document and records control; retention and deletion; customer contract review; supplier and subcontractor qualification; technician competence and training; work-order acceptance, execution and verification; equipment chain of custody; customer feedback and complaints; nonconformity and corrective action; environmental aspects, waste and emissions; occupational health and safety; emergency response; business continuity and disaster recovery; internal audit; management review; anti-bribery and conflicts; ethical labour and ESG; AI usage governance; secure software development; legal and customer compliance; evidence release and confidentiality.

Obtain applicable official standards and customer requirements before claiming clause-level coverage. Assess applicability, ownership, implementation, effectiveness and genuine evidence independently. Drafts are not approved policies. Self-review is recorded in A and does not substitute for independent audit or customer-required segregation of duties.

## Evidence contract
A exposes document metadata and controlled version content through the authenticated /api/admin/ims routes. The ims_events table records document actions transactionally. Existing activity_log remains a separate legacy source; it is not yet transactional with all operational writes. B should reference immutable version IDs, work-order IDs and events without copying personal information unnecessarily. C should produce scoped, reviewed export snapshots with a manifest, checksums, redactions and explicit gaps; no invented records or readiness percentages.

## Storage and deployment
A uses bounded MySQL BLOB storage (5 MiB per document), so no new storage service is required. This is intentionally a small-volume starting design; large files, quotas, retention automation, malware scanning, storage adapter integration, Nextcloud/SharePoint, generated Word/Excel/PDF reports, MFA, offsite backup automation and immutable external logs remain outstanding. File signature checks are not malware scanning. Do not upload untrusted or sensitive customer files until controls and contractual requirements are verified. Store production data only in an authorized deployment with backup and access controls. Keep the current APP_ROLE settings; no DNS changes required for A. Hostinger capacity and backup/restore must be verified separately.
