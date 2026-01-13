import yaml from 'js-yaml';
import { nanoid } from 'nanoid';
import type { Logger } from './github.service.js';

/**
 * Author information for comments/replies
 */
export interface CommentAuthor {
  username: string;
  avatarUrl: string | null;
}

/**
 * Reply to a comment
 */
export interface CommentReply {
  id: string;
  author: CommentAuthor;
  text: string;
  createdAt: string;
}

/**
 * Comment on a document
 */
export interface DocumentComment {
  id: string;
  charStart: number;
  charEnd: number;
  author: CommentAuthor;
  text: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentReply[];
}

/**
 * Comment file structure (YAML frontmatter + Markdown body)
 */
export interface CommentFileData {
  version: number;
  documentPath: string;
  comments: DocumentComment[];
}

/**
 * Service for managing comments stored in GitHub as YAML frontmatter files
 */
export class CommentFileService {
  /**
   * Get the comment file path for a given document
   * Comments are stored in a .mume folder at the repo root, preserving the original path structure.
   * 
   * Example: "README.md" → ".mume/README.md"
   * Example: "docs/guide.md" → ".mume/docs/guide.md"
   * Example: "folder/subfolder/file.md" → ".mume/folder/subfolder/file.md"
   */
  getCommentsFilePath(documentPath: string): string {
    return `.mume/${documentPath}`;
  }

  /**
   * Parse comment file content
   * Expects YAML frontmatter followed by markdown body
   */
  parseCommentFile(content: string, logger?: Logger): CommentFileData {
    try {
      // Extract YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontmatterMatch) {
        throw new Error('Invalid comment file format: missing YAML frontmatter');
      }

      const yamlContent = frontmatterMatch[1]!;
      const data = yaml.load(yamlContent) as CommentFileData;

      // Validate structure
      if (!data.version || !data.documentPath || !Array.isArray(data.comments)) {
        throw new Error('Invalid comment file structure');
      }

      return data;
    } catch (error) {
      logger?.error(
        'Failed to parse comment file',
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'parseCommentFile' }
      );
      throw error;
    }
  }

  /**
   * Serialize comment data to file format (YAML frontmatter + Markdown body)
   */
  serializeCommentFile(data: CommentFileData): string {
    const yamlStr = yaml.dump(data, {
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true,
    });

    const markdown = `---
${yamlStr}---

# Comments for ${data.documentPath}

This file contains review comments for the associated document.
Do not edit manually - managed by the collaborative editor.
`;

    return markdown;
  }

  /**
   * Create an empty comment file structure
   */
  createEmptyCommentFile(documentPath: string): CommentFileData {
    return {
      version: 1,
      documentPath,
      comments: [],
    };
  }

  /**
   * Generate a unique comment ID
   */
  generateCommentId(): string {
    return `c-${nanoid(10)}`;
  }

  /**
   * Generate a unique reply ID
   */
  generateReplyId(): string {
    return `r-${nanoid(10)}`;
  }

  /**
   * Add a new comment to the comment data
   */
  addComment(
    data: CommentFileData,
    comment: Omit<DocumentComment, 'id' | 'createdAt' | 'updatedAt' | 'replies'>
  ): { data: CommentFileData; commentId: string } {
    const now = new Date().toISOString();
    const commentId = this.generateCommentId();

    const newComment: DocumentComment = {
      id: commentId,
      charStart: comment.charStart,
      charEnd: comment.charEnd,
      author: comment.author,
      text: comment.text,
      resolved: comment.resolved,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };

    data.comments.push(newComment);

    // Sort comments by charStart
    data.comments.sort((a, b) => a.charStart - b.charStart);

    return { data, commentId };
  }

  /**
   * Add a reply to an existing comment
   */
  addReply(
    data: CommentFileData,
    commentId: string,
    reply: Omit<CommentReply, 'id' | 'createdAt'>
  ): { data: CommentFileData; replyId: string } {
    const comment = data.comments.find((c) => c.id === commentId);

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    const now = new Date().toISOString();
    const replyId = this.generateReplyId();

    const newReply: CommentReply = {
      id: replyId,
      author: reply.author,
      text: reply.text,
      createdAt: now,
    };

    comment.replies.push(newReply);
    comment.updatedAt = now;

    return { data, replyId };
  }

  /**
   * Update comment resolved status
   */
  updateCommentResolved(
    data: CommentFileData,
    commentId: string,
    resolved: boolean
  ): CommentFileData {
    const comment = data.comments.find((c) => c.id === commentId);

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    comment.resolved = resolved;
    comment.updatedAt = new Date().toISOString();

    return data;
  }

  /**
   * Delete a comment
   */
  deleteComment(data: CommentFileData, commentId: string): CommentFileData {
    const index = data.comments.findIndex((c) => c.id === commentId);

    if (index === -1) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    data.comments.splice(index, 1);

    return data;
  }

  /**
   * Get a specific comment by ID
   */
  getComment(data: CommentFileData, commentId: string): DocumentComment | null {
    return data.comments.find((c) => c.id === commentId) || null;
  }

  /**
   * Convert API format comment to DocumentComment format
   * Used for backward compatibility with existing API responses
   */
  convertToApiFormat(comment: DocumentComment, userId: number): any {
    return {
      id: comment.id,
      userId,
      documentPath: '',
      repoOwner: '',
      repoName: '',
      charStart: comment.charStart,
      charEnd: comment.charEnd,
      text: comment.text,
      resolved: comment.resolved,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: userId,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl,
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        commentId: comment.id,
        userId,
        text: reply.text,
        createdAt: reply.createdAt,
        updatedAt: reply.createdAt,
        user: {
          id: userId,
          username: reply.author.username,
          avatarUrl: reply.author.avatarUrl,
        },
      })),
    };
  }
}
