CREATE TABLE IF NOT EXISTS milestones (
  milestone_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id       INT UNSIGNED NOT NULL,
  name             VARCHAR(100) NOT NULL,
  status           ENUM('pending', 'submitted', 'approved', 'late') NOT NULL DEFAULT 'pending',
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  due_date         DATE,
  completed_at     DATETIME,

  CONSTRAINT fk_milestones_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,
  CONSTRAINT chk_milestones_progress CHECK (progress_percent BETWEEN 0 AND 100),

  INDEX idx_milestones_project (project_id),
  INDEX idx_milestones_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
