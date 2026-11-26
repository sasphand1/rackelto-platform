# Rackelto IMS hardening release candidate
Base: original archive plus Core, Core Hotfix, Compliance, CI, Assurance and Filing releases. Apply after both Assurance and Filing have merged. No production database migration is introduced by this patch.

## Included
* Administrator-only historical exports with native PDF summary, XLSX control register, CSV registers, JSON manifest and optional exact approved source bytes. Private filing files are deliberately excluded. Corrupt approved documents cause an explicit source export failure. Source bytes limited to 8 MiB and package to 10 MiB. Existing exports are unchanged. Review confidentiality before external distribution.
* GitHub workflow result sync, on administrator request, restricted to this repository's completed main-branch runs. Set IMS_GITHUB_TOKEN in Hostinger environment for private repository access (fine-grained token with Actions read only). No token is needed for public repository if API rate limit permits. Do not commit token. Not a scheduled synchronization service.
* Corporate folders initialized on explicit administrator action; repeatable, restricted by default, existing files and directories preserved.
* No-store on API responses; optional fail-closed ClamAV upload scanning for both filing and controlled document routes. Set IMS_SCAN_MODE=required only when ClamAV with current signatures is installed and reachable; default off, no scan claim. Set IMS_CLAMSCAN to trusted executable path if necessary. Do not allow untrusted users to edit environment settings.
* CI backup/restore rehearsal uses only the disposable MySQL service, compares key table counts and stored binary hashes. No production backup is taken by the CI workflow. Back up production independently and verify restore into an isolated environment.
* Mandatory production dependency audit high/critical gate. Existing findings may block merging. Review npm audit JSON and remediate exact packages with compatible upgrades; never bypass the gate or blindly use --force.

## Acceptance and limitations
This is a partial hardening release candidate, not complete security certification. Local unit/packaging tests and independent PDF/XLSX parsing pass. GitHub integration tested using mocked response only. Real MySQL and browser runs, backup restoration, actual malware scanning, npm audit and Hostinger validation require target CI/infrastructure. No independent penetration test has occurred. External auditor identity, redaction, automatic scheduled GitHub sync, Office editing and storage adapters, full policy library, clause completeness, production backup scheduling, MFA and full workflow authorization hardening are not delivered. Existing document self-approval remains unchanged; assign independent reviewer in actual audit process where required. Do not declare ISO compliance or production security based on this release.

## Deployment
Use feature branch and required quality-gate, review dependency audit. Do not merge on failed checks. Verify admin document creation/download, approved-source export, folder setup and permissions on production after merge. Back up DB before deployment. Roll back via reviewed revert PR if needed.
