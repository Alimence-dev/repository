CREATE TABLE IF NOT EXISTS documents (
  document_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   INT UNSIGNED NOT NULL,
  file_path    VARCHAR(500) NOT NULL,
  version      INT UNSIGNED NOT NULL DEFAULT 1,
  doc_type     ENUM('proposal', 'chapter', 'final') NOT NULL,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_documents_project FOREIGN KEY (project_id) REFERENCES projects (project_id) ON DELETE CASCADE,

  INDEX idx_documents_project (project_id),
  INDEX idx_documents_type (doc_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
