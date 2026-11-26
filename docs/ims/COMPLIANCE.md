# Module B — compliance register and command workspace

Apply on top of Core and Core Hotfix. No new dependencies, storage subscriptions or changes to existing public/partner pages. The admin application shares the current MySQL database and authentication. On admin startup the core schema is verified first, then two additional tables are created under the existing migration lock. Failure in the B migration does not disable Core. Back up database before release. Do not run db:setup. Existing document versions are preserved. Reverting application files does not remove additive tables.

## Test on production using clearly marked test data
1. Open the dedicated admin domain, verify command centre and new navigation. Check counts against actual work orders.
2. In Document Control, download the previously uploaded statement and verify content; submit, review and approve only if genuinely accepted. Set an appropriate review date.
3. In Compliance Centre, register an actual applicable requirement with a source reference. It must start unassessed. Assess it with a reason, and confirm that implemented/verified is rejected without a currently approved document version. These statuses are internal assessments, not certification. Assess the actual relevance of evidence separately.
4. In Governance Register create a clearly labelled test risk or action and link it to a requirement. Update it, and verify closure fails without approved evidence and a note. Do not present test data as genuine operational evidence.
5. Check dashboard counts and priority actions. Verify existing customer and work-order functionality still works. Verify a non-admin/manager cannot access IMS APIs.
6. Check Hostinger logs for schema readiness. Investigate reported dependency vulnerabilities separately using npm audit, not forced automatic upgrades.

## Scope and limitations
The configurable requirement and governance registers cover the categories listed in compliance-contracts.js. They are a foundation for a full management system, not a complete clause library or proof of compliance. Obtain licensed applicable standards and customer requirements and register the actual obligations. No standards text or fabricated records are preloaded. Evidence links are to approved document versions; historical assessments remain stored even if evidence subsequently becomes stale; the interface displays the linked status but automatic expiry re-evaluation remains outstanding. Record owners currently default to the creating user. Assessment and closure notes are logged transactionally in ims_events. Self-assessments are explicitly recorded, not independent certification. Existing operations are read for dashboard metrics, not yet subject to mandatory qualification or SLA gates. Specialized workflows, document templates, reminders, policy adoption, automated cross-control evaluation, evidence export, folder-level access, MFA, malware scanning and offsite backup testing are not included. Record lists are bounded to 500 recent records; server pagination and search are future work. Do not use as a sensitive production evidence repository until remaining security controls are evaluated.

## Rollback
Revert the B release commit and redeploy. Leave the two additive tables in place for data retention. Restore from backup only as an authorized recovery action; do not delete operational data.
