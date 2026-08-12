CREATE TABLE IF NOT EXISTS audit_log (
  log_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  action          VARCHAR(150) NOT NULL,
  entity_affected VARCHAR(150),
  timestamp       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT,

  INDEX idx_audit_log_user (user_id),
  INDEX idx_audit_log_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
