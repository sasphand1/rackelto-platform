CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 name VARCHAR(160) NOT NULL, role ENUM('admin','manager','dispatcher','viewer') NOT NULL DEFAULT 'viewer',
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS partners (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 type ENUM('freelancer','service_company','regional_partner') NOT NULL,
 full_name VARCHAR(160) NOT NULL, company_name VARCHAR(160), email VARCHAR(254) NOT NULL,
 phone VARCHAR(70), whatsapp VARCHAR(70), linkedin VARCHAR(500), telegram VARCHAR(160), other_contact VARCHAR(500),
 country VARCHAR(100) NOT NULL, city VARCHAR(140) NOT NULL, travel_radius_km INT UNSIGNED,
 skills JSON NOT NULL, languages VARCHAR(300), experience_years SMALLINT UNSIGNED,
 hourly_rate DECIMAL(12,2), currency CHAR(3) DEFAULT 'EUR', availability VARCHAR(150),
 notes TEXT, status ENUM('applied','screening','verified','approved','inactive','rejected') NOT NULL DEFAULT 'applied',
 consent_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX ix_partner_geo (country,city), INDEX ix_partner_status (status), INDEX ix_partner_email (email)
);
CREATE TABLE IF NOT EXISTS enquiries (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
 name VARCHAR(160) NOT NULL, company VARCHAR(160), email VARCHAR(254) NOT NULL, phone VARCHAR(70),
 service VARCHAR(150), message TEXT NOT NULL,
 status ENUM('new','contacted','qualified','closed') NOT NULL DEFAULT 'new', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, name VARCHAR(180) NOT NULL, contact_name VARCHAR(160),
 email VARCHAR(254), phone VARCHAR(70), country VARCHAR(100), notes TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, customer_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(180) NOT NULL, description TEXT, country VARCHAR(100), city VARCHAR(140),
 starts_on DATE, due_on DATE,
 status ENUM('planned','active','on_hold','completed','cancelled') NOT NULL DEFAULT 'planned',
 budget DECIMAL(14,2), currency CHAR(3) NOT NULL DEFAULT 'EUR', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (customer_id) REFERENCES customers(id), INDEX ix_project_status(status)
);
CREATE TABLE IF NOT EXISTS work_orders (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, project_id BIGINT UNSIGNED NOT NULL,
 title VARCHAR(180) NOT NULL, description TEXT, site_address VARCHAR(400), city VARCHAR(140), country VARCHAR(100),
 scheduled_at DATETIME, due_at DATETIME,
 priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
 status ENUM('open','assigned','accepted','in_progress','blocked','completed','cancelled') NOT NULL DEFAULT 'open',
 partner_id BIGINT UNSIGNED NULL, client_rate DECIMAL(12,2), supplier_cost DECIMAL(12,2),
 completion_notes TEXT, completed_at DATETIME, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (project_id) REFERENCES projects(id), FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL,
 INDEX ix_work_project(project_id), INDEX ix_work_partner(partner_id), INDEX ix_work_status(status)
);
CREATE TABLE IF NOT EXISTS activity_log (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, actor_user_id BIGINT UNSIGNED,
 entity_type VARCHAR(50) NOT NULL, entity_id BIGINT UNSIGNED, action VARCHAR(70) NOT NULL,
 detail TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS sessions (sid VARCHAR(128) PRIMARY KEY, expires_at DATETIME NOT NULL, session_json LONGTEXT NOT NULL, INDEX ix_session_expiry(expires_at));
