CREATE TABLE IF NOT EXISTS feedback (
  feedback_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   INT UNSIGNED NOT NULL,
  given_by     INT UNSIGNED NOT NULL,
  comment      TEXT,
  rating       TINYINT UNSIGNED,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_feedback_project  FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  CONSTRAINT fk_feedback_given_by FOREIGN KEY (given_by)   REFERENCES users (user_id)        ON DELETE RESTRICT,
  CONSTRAINT chk_feedback_rating  CHECK (rating BETWEEN 1 AND 5),

  INDEX idx_feedback_project (project_id),
  INDEX idx_feedback_given_by (given_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
