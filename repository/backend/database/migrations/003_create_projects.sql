CREATE TABLE IF NOT EXISTS projects (
  project_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id         INT UNSIGNED NOT NULL,
  supervisor_id      INT UNSIGNED,
  topic_id           INT UNSIGNED NOT NULL,
  title              VARCHAR(255) NOT NULL,
  stage              ENUM('proposal', 'in_progress', 'defense', 'completed') NOT NULL DEFAULT 'proposal',
  similarity_score   DECIMAL(5,4),
  plagiarism_score   DECIMAL(5,4),
  predicted_deadline DATE,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_projects_student    FOREIGN KEY (student_id)    REFERENCES users (user_id)  ON DELETE RESTRICT,
  CONSTRAINT fk_projects_supervisor FOREIGN KEY (supervisor_id) REFERENCES users (user_id)  ON DELETE RESTRICT,
  CONSTRAINT fk_projects_topic      FOREIGN KEY (topic_id)      REFERENCES topics (topic_id) ON DELETE RESTRICT,

  INDEX idx_projects_stage (stage),
  INDEX idx_projects_student (student_id),
  INDEX idx_projects_supervisor (supervisor_id),
  UNIQUE INDEX uq_projects_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
