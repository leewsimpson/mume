-- Test data seed for E2E tests
-- This file provides initial data for test scenarios

-- Test users
INSERT INTO users (id, github_id, username, email, avatar_url)
VALUES
  (1, '12345', 'alice-test', 'alice@test.com', 'https://avatars.githubusercontent.com/u/12345?v=4'),
  (2, '67890', 'bob-test', 'bob@test.com', 'https://avatars.githubusercontent.com/u/67890?v=4'),
  (3, '11111', 'charlie-test', 'charlie@test.com', 'https://avatars.githubusercontent.com/u/11111?v=4')
ON CONFLICT (github_id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  avatar_url = EXCLUDED.avatar_url;

-- Update sequence to avoid ID conflicts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Mock tokens (encryption values don't need to be real for testing)
INSERT INTO user_tokens (user_id, provider, access_token_encrypted, access_token_iv, access_token_auth_tag, scope)
VALUES
  (1, 'github', 'mock-encrypted-token-alice', 'mock-iv-alice', 'mock-auth-alice', 'repo,user:email'),
  (2, 'github', 'mock-encrypted-token-bob', 'mock-iv-bob', 'mock-auth-bob', 'repo,user:email'),
  (3, 'github', 'mock-encrypted-token-charlie', 'mock-iv-charlie', 'mock-auth-charlie', 'repo,user:email')
ON CONFLICT DO NOTHING;

-- Sample comments for testing (optional - can be seeded per test)
-- These are added via fixtures for specific tests
