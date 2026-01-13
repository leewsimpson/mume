import { jest } from '@jest/globals';
import { CommentFileService, CommentFileData } from '../src/services/comment-file.service.js';

describe('CommentFileService', () => {
  let service: CommentFileService;
  
  beforeEach(() => {
    service = new CommentFileService();
  });

  describe('getCommentsFilePath', () => {
    it('should return correct path in .mume folder', () => {
      expect(service.getCommentsFilePath('README.md')).toBe('.mume/README.md');
      expect(service.getCommentsFilePath('docs/guide.md')).toBe('.mume/docs/guide.md');
    });
  });

  describe('createEmptyCommentFile', () => {
    it('should create valid empty structure', () => {
      const data = service.createEmptyCommentFile('test.md');
      expect(data.version).toBe(1);
      expect(data.documentPath).toBe('test.md');
      expect(data.comments).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should add comment and generate ID', () => {
      const data = service.createEmptyCommentFile('test.md');
      const comment = {
        charStart: 0,
        charEnd: 10,
        author: { username: 'testuser', avatarUrl: null },
        text: 'Test comment',
        resolved: false
      };

      const result = service.addComment(data, comment);
      
      expect(result.commentId).toBeDefined();
      expect(data.comments).toHaveLength(1);
      expect(data.comments[0].id).toBe(result.commentId);
      expect(data.comments[0].text).toBe('Test comment');
      expect(data.comments[0].replies).toEqual([]);
    });

    it('should sort comments by charStart', () => {
      const data = service.createEmptyCommentFile('test.md');
      
      service.addComment(data, {
        charStart: 100,
        charEnd: 110,
        author: { username: 'user1', avatarUrl: null },
        text: 'Second',
        resolved: false
      });

      service.addComment(data, {
        charStart: 0,
        charEnd: 10,
        author: { username: 'user2', avatarUrl: null },
        text: 'First',
        resolved: false
      });

      expect(data.comments[0].text).toBe('First');
      expect(data.comments[1].text).toBe('Second');
    });
  });

  describe('addReply', () => {
    it('should add reply to existing comment', () => {
      const data = service.createEmptyCommentFile('test.md');
      const { commentId } = service.addComment(data, {
        charStart: 0,
        charEnd: 10,
        author: { username: 'testuser', avatarUrl: null },
        text: 'Parent comment',
        resolved: false
      });

      const reply = {
        author: { username: 'replyuser', avatarUrl: null },
        text: 'Reply text'
      };

      const result = service.addReply(data, commentId, reply);

      expect(result.replyId).toBeDefined();
      expect(data.comments[0].replies).toHaveLength(1);
      expect(data.comments[0].replies[0].id).toBe(result.replyId);
      expect(data.comments[0].replies[0].text).toBe('Reply text');
    });

    it('should throw error if comment not found', () => {
      const data = service.createEmptyCommentFile('test.md');
      const reply = {
        author: { username: 'replyuser', avatarUrl: null },
        text: 'Reply text'
      };

      expect(() => {
        service.addReply(data, 'non-existent-id', reply);
      }).toThrow('Comment not found');
    });
  });

  describe('updateCommentResolved', () => {
    it('should update resolved status', () => {
      const data = service.createEmptyCommentFile('test.md');
      const { commentId } = service.addComment(data, {
        charStart: 0,
        charEnd: 10,
        author: { username: 'testuser', avatarUrl: null },
        text: 'Test comment',
        resolved: false
      });

      service.updateCommentResolved(data, commentId, true);
      expect(data.comments[0].resolved).toBe(true);

      service.updateCommentResolved(data, commentId, false);
      expect(data.comments[0].resolved).toBe(false);
    });
  });

  describe('deleteComment', () => {
    it('should remove comment', () => {
      const data = service.createEmptyCommentFile('test.md');
      const { commentId } = service.addComment(data, {
        charStart: 0,
        charEnd: 10,
        author: { username: 'testuser', avatarUrl: null },
        text: 'Test comment',
        resolved: false
      });

      service.deleteComment(data, commentId);
      expect(data.comments).toHaveLength(0);
    });
  });

  describe('serialization', () => {
    it('should serialize and parse correctly', () => {
      const data = service.createEmptyCommentFile('test.md');
      service.addComment(data, {
        charStart: 0,
        charEnd: 10,
        author: { username: 'testuser', avatarUrl: null },
        text: 'Test comment',
        resolved: false
      });

      const serialized = service.serializeCommentFile(data);
      expect(serialized).toContain('---');
      expect(serialized).toContain('version: 1');
      
      const parsed = service.parseCommentFile(serialized);
      expect(parsed).toEqual(data);
    });
  });
});
