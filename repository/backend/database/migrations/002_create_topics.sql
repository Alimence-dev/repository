CREATE TABLE IF NOT EXISTS topics (
  topic_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  proposed_by       INT UNSIGNED NOT NULL,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  embedding_vector  JSON,
  status            ENUM('approved', 'rejected', 'duplicate', 'pending') NOT NULL DEFAULT 'pending',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_topics_proposed_by FOREIGN KEY (proposed_by) REFERENCES users (user_id) ON DELETE RESTRICT,

  INDEX idx_topics_status (status),
  INDEX idx_topics_proposed_by (proposed_by),
  FULLTEXT INDEX ft_topics_title_description (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
