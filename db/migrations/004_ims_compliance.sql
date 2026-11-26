CREATE TABLE IF NOT EXISTS ims_controls (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 framework VARCHAR(100) NOT NULL, reference VARCHAR(100) NOT NULL,
 title VARCHAR(200) NOT NULL, description TEXT NOT NULL,
 owner_id BIGINT UNSIGNED NOT NULL, status ENUM('unassessed','planned','implemented','verified','not_applicable') NOT NULL DEFAULT 'unassessed',
 evidence_version_id BIGINT UNSIGNED NULL, assessment_note TEXT NULL, due_date DATE NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE(framework,reference), FOREIGN KEY(owner_id) REFERENCES users(id), FOREIGN KEY(evidence_version_id) REFERENCES ims_document_versions(id)
);
CREATE TABLE IF NOT EXISTS ims_governance_records (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 kind VARCHAR(50) NOT NULL, title VARCHAR(200) NOT NULL, description TEXT NOT NULL,
 owner_id BIGINT UNSIGNED NOT NULL, priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
 status ENUM('open','in_progress','closed') NOT NULL DEFAULT 'open', due_date DATE NULL,
 control_id BIGINT UNSIGNED NULL, evidence_version_id BIGINT UNSIGNED NULL, closure_note TEXT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(owner_id) REFERENCES users(id), FOREIGN KEY(control_id) REFERENCES ims_controls(id), FOREIGN KEY(evidence_version_id) REFERENCES ims_document_versions(id)
);
