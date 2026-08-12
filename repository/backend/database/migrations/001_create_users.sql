CREATE TABLE IF NOT EXISTS users (
  user_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(190) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('student', 'supervisor', 'coordinator', 'admin') NOT NULL,
  department      VARCHAR(120),
  expertise_tags  VARCHAR(500),
  status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
