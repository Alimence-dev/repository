CREATE TABLE IF NOT EXISTS repository (
  repository_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id        INT UNSIGNED NOT NULL,
  title             VARCHAR(255) NOT NULL,
  keywords          VARCHAR(500),
  department        VARCHAR(120),
  year              YEAR NOT NULL,
  archived_file_path VARCHAR(500) NOT NULL,

  CONSTRAINT fk_repository_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,

  UNIQUE INDEX uq_repository_project (project_id),
  INDEX idx_repository_department (department),
  INDEX idx_repository_year (year),
  FULLTEXT INDEX ft_repository_title_keywords (title, keywords)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
