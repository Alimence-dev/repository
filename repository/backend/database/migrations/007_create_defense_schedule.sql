CREATE TABLE IF NOT EXISTS defense_schedule (
  defense_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id      INT UNSIGNED NOT NULL,
  panel_members   JSON NOT NULL,
  scheduled_date  DATETIME NOT NULL,
  room            VARCHAR(100) NOT NULL,
  status          ENUM('scheduled', 'completed') NOT NULL DEFAULT 'scheduled',
  result          VARCHAR(255),

  CONSTRAINT fk_defense_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,

  UNIQUE INDEX uq_defense_project (project_id),
  INDEX idx_defense_status (status),
  INDEX idx_defense_scheduled_date (scheduled_date),
  INDEX idx_defense_room (room)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
