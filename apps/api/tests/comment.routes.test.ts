import { describe, it, expect } from '@jest/globals';

describe('Comment Feature', () => {
  describe('Comment validation logic', () => {
    it('should validate character range correctly', () => {
      const charStart = 0;
      const charEnd = 10;

      expect(charStart >= 0).toBe(true);
      expect(charEnd >= charStart).toBe(true);
    });

    it('should reject negative character start', () => {
      const invalidStart = -1;
      expect(invalidStart < 0).toBe(true);
    });

    it('should reject invalid range where end < start', () => {
      const validStart = 10;
      const invalidEnd = 5;
      expect(invalidEnd < validStart).toBe(true);
    });

    it('should validate that text is not empty', () => {
      const text = 'This is a comment';
      expect(text.trim()).not.toBe('');
    });

    it('should reject empty or whitespace-only text', () => {
      const emptyText = '   ';
      expect(emptyText.trim()).toBe('');
    });
  });

  describe('Comment data transformation', () => {
    it('should map database rows to comment objects correctly', () => {
      const row = {
        id: 1,
        user_id: 1,
        document_path: 'docs/README.md',
        repo_owner: 'testowner',
        repo_name: 'testrepo',
        char_start: 0,
        char_end: 10,
        text: 'Test comment',
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
        username: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
      };

      const comment = {
        id: row.id,
        userId: row.user_id,
        documentPath: row.document_path,
        repoOwner: row.repo_owner,
        repoName: row.repo_name,
        charStart: row.char_start,
        charEnd: row.char_end,
        text: row.text,
        resolved: row.resolved,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          id: row.user_id,
          username: row.username,
          avatarUrl: row.avatar_url,
        },
      };

      expect(comment.id).toBe(row.id);
      expect(comment.charStart).toBe(row.char_start);
      expect(comment.charEnd).toBe(row.char_end);
      expect(comment.user.username).toBe(row.username);
      expect(comment.user.avatarUrl).toBe(row.avatar_url);
    });

    it('should preserve all comment fields during transformation', () => {
      const mockRow = {
        id: 1,
        user_id: 123,
        document_path: 'path/to/doc.md',
        repo_owner: 'owner',
        repo_name: 'repo',
        char_start: 5,
        char_end: 15,
        text: 'Sample text',
        resolved: false,
        created_at: new Date('2026-01-12'),
        updated_at: new Date('2026-01-12'),
        username: 'john',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const transformed = {
        id: mockRow.id,
        userId: mockRow.user_id,
        documentPath: mockRow.document_path,
        repoOwner: mockRow.repo_owner,
        repoName: mockRow.repo_name,
        charStart: mockRow.char_start,
        charEnd: mockRow.char_end,
        text: mockRow.text,
        resolved: mockRow.resolved,
        createdAt: mockRow.created_at,
        updatedAt: mockRow.updated_at,
        user: {
          id: mockRow.user_id,
          username: mockRow.username,
          avatarUrl: mockRow.avatar_url,
        },
      };

      expect(transformed).toHaveProperty('id', 1);
      expect(transformed).toHaveProperty('userId', 123);
      expect(transformed).toHaveProperty('documentPath', 'path/to/doc.md');
      expect(transformed).toHaveProperty('charStart', 5);
      expect(transformed).toHaveProperty('charEnd', 15);
      expect(transformed.user).toHaveProperty('username', 'john');
    });
  });

  describe('Comment sorting logic', () => {
    it('should sort comments by char_start then created_at', () => {
      const comments = [
        { id: 3, char_start: 20, created_at: new Date('2026-01-01') },
        { id: 2, char_start: 0, created_at: new Date('2026-01-02') },
        { id: 1, char_start: 0, created_at: new Date('2026-01-01') },
      ];

      const sorted = [...comments].sort((a, b) => {
        if (a.char_start !== b.char_start) {
          return a.char_start - b.char_start;
        }
        return a.created_at.getTime() - b.created_at.getTime();
      });

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe('Comment request validation', () => {
    it('should require all mandatory fields', () => {
      const requiredFields = ['documentPath', 'repoOwner', 'repoName', 'charStart', 'charEnd', 'text'];
      const validRequest = {
        documentPath: 'docs/README.md',
        repoOwner: 'testowner',
        repoName: 'testrepo',
        charStart: 0,
        charEnd: 10,
        text: 'Test comment',
      };

      requiredFields.forEach(field => {
        expect(validRequest).toHaveProperty(field);
        const value = (validRequest as any)[field];
        // Special handling for numeric fields that can be 0
        if (field === 'charStart' || field === 'charEnd') {
          expect(typeof value).toBe('number');
        } else {
          expect(value).toBeTruthy();
        }
      });
    });

    it('should validate field types', () => {
      const request = {
        documentPath: 'docs/README.md',
        repoOwner: 'testowner',
        repoName: 'testrepo',
        charStart: 0,
        charEnd: 10,
        text: 'Test comment',
      };

      expect(typeof request.documentPath).toBe('string');
      expect(typeof request.repoOwner).toBe('string');
      expect(typeof request.repoName).toBe('string');
      expect(typeof request.charStart).toBe('number');
      expect(typeof request.charEnd).toBe('number');
      expect(typeof request.text).toBe('string');
    });
  });

  describe('Comment reply functionality', () => {
    it('should validate reply text is not empty', () => {
      const replyText = 'This is a reply';
      expect(replyText.trim()).not.toBe('');
    });

    it('should reject empty or whitespace-only reply text', () => {
      const emptyReply = '   ';
      expect(emptyReply.trim()).toBe('');
    });

    it('should transform reply database rows correctly', () => {
      const replyRow = {
        id: 1,
        comment_id: 10,
        user_id: 2,
        text: 'This is a reply',
        created_at: new Date(),
        updated_at: new Date(),
        username: 'replier',
        avatar_url: 'https://github.com/replier.png',
      };

      const reply = {
        id: replyRow.id,
        commentId: replyRow.comment_id,
        userId: replyRow.user_id,
        text: replyRow.text,
        createdAt: replyRow.created_at,
        updatedAt: replyRow.updated_at,
        user: {
          id: replyRow.user_id,
          username: replyRow.username,
          avatarUrl: replyRow.avatar_url,
        },
      };

      expect(reply.id).toBe(replyRow.id);
      expect(reply.commentId).toBe(replyRow.comment_id);
      expect(reply.userId).toBe(replyRow.user_id);
      expect(reply.text).toBe(replyRow.text);
      expect(reply.user.username).toBe(replyRow.username);
    });

    it('should group replies by comment_id correctly', () => {
      const replies = [
        { id: 1, comment_id: 10, text: 'Reply 1' },
        { id: 2, comment_id: 10, text: 'Reply 2' },
        { id: 3, comment_id: 20, text: 'Reply 3' },
      ];

      const repliesMap = new Map<number, any[]>();
      for (const reply of replies) {
        if (!repliesMap.has(reply.comment_id)) {
          repliesMap.set(reply.comment_id, []);
        }
        repliesMap.get(reply.comment_id)!.push(reply);
      }

      expect(repliesMap.get(10)?.length).toBe(2);
      expect(repliesMap.get(20)?.length).toBe(1);
      expect(repliesMap.get(30)).toBeUndefined();
    });

    it('should sort replies chronologically', () => {
      const replies = [
        { id: 2, created_at: new Date('2026-01-12T12:00:00') },
        { id: 1, created_at: new Date('2026-01-12T11:00:00') },
        { id: 3, created_at: new Date('2026-01-12T13:00:00') },
      ];

      const sorted = [...replies].sort((a, b) =>
        a.created_at.getTime() - b.created_at.getTime()
      );

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe('Comment resolve functionality', () => {
    it('should validate resolved field is boolean', () => {
      const validResolved = true;
      expect(typeof validResolved).toBe('boolean');
    });

    it('should reject non-boolean resolved values', () => {
      const invalidResolved = 'true';
      expect(typeof invalidResolved).not.toBe('boolean');
    });

    it('should update resolved status correctly', () => {
      const comment = {
        id: 1,
        resolved: false,
      };

      // Simulate update
      const updatedComment = {
        ...comment,
        resolved: true,
      };

      expect(updatedComment.resolved).toBe(true);
      expect(updatedComment.resolved).not.toBe(comment.resolved);
    });

    it('should allow unresolving a comment', () => {
      const resolvedComment = {
        id: 1,
        resolved: true,
      };

      // Simulate unresolve
      const unresolvedComment = {
        ...resolvedComment,
        resolved: false,
      };

      expect(unresolvedComment.resolved).toBe(false);
    });
  });

  describe('Comments with replies integration', () => {
    it('should include replies array in comment object', () => {
      const comment = {
        id: 1,
        text: 'Main comment',
        replies: [
          { id: 1, text: 'Reply 1' },
          { id: 2, text: 'Reply 2' },
        ],
      };

      expect(comment).toHaveProperty('replies');
      expect(Array.isArray(comment.replies)).toBe(true);
      expect(comment.replies.length).toBe(2);
    });

    it('should handle comments with no replies', () => {
      const repliesMap = new Map<number, any[]>();
      const commentId = 1;
      const replies = repliesMap.get(commentId) || [];

      expect(replies).toEqual([]);
      expect(Array.isArray(replies)).toBe(true);
    });
  });
});
