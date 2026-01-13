-- Migration 004: Create comment_replies table
CREATE TABLE IF NOT EXISTS comment_replies (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id);
