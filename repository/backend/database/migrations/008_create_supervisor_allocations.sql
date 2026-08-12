CREATE TABLE IF NOT EXISTS supervisor_allocations (
  allocation_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id     INT UNSIGNED NOT NULL,
  supervisor_id  INT UNSIGNED NOT NULL,
  match_score    DECIMAL(5,4),
  approved_by    INT UNSIGNED NOT NULL,
  allocated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_allocations_student    FOREIGN KEY (student_id)    REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocations_supervisor FOREIGN KEY (supervisor_id) REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_allocations_approved_by FOREIGN KEY (approved_by) REFERENCES users (user_id) ON DELETE RESTRICT,

  INDEX idx_allocations_student (student_id),
  INDEX idx_allocations_supervisor (supervisor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
