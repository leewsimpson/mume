/**
 * Metadata for a document being tracked for GitHub sync
 */
export interface DocumentMetadata {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** File path within the repository */
  filePath: string;
  /** Current SHA of the file in GitHub (updated after each save) */
  sha: string;
  /** GitHub access token for saving */
  token: string;
  /** Whether a save operation is currently in progress */
  isSaving: boolean;
  /** Timestamp of last save */
  lastSaved: Date;
  /** Set of user names who have edited this document */
  editors: Set<string>;
}

/**
 * Service to manage metadata of documents being edited
 * Tracks which documents need to be saved to GitHub
 * The actual Y.Doc instances are managed by y-websocket
 */
export class DocumentStateService {
  private documents: Map<string, DocumentMetadata> = new Map();

  /**
   * Register a document for automatic syncing
   * @param documentId - Unique identifier (e.g., "owner/repo/path/to/file.md")
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param filePath - File path within repository
   * @param sha - Current GitHub SHA of the file
   * @param token - GitHub access token for saving
   */
  registerDocument(
    documentId: string,
    owner: string,
    repo: string,
    filePath: string,
    sha: string,
    token: string
  ): void {
    if (this.documents.has(documentId)) {
      // Document already registered, update metadata
      const doc = this.documents.get(documentId)!;
      doc.sha = sha;
      doc.token = token;
      return;
    }

    const metadata: DocumentMetadata = {
      owner,
      repo,
      filePath,
      sha,
      token,
      isSaving: false,
      lastSaved: new Date(),
      editors: new Set(),
    };

    this.documents.set(documentId, metadata);
  }

  /**
   * Add an editor to a document
   * @param documentId - Document identifier
   * @param userName - User name to add to editors set
   */
  addEditor(documentId: string, userName: string): void {
    const metadata = this.documents.get(documentId);
    if (metadata) {
      metadata.editors.add(userName);
    }
  }

  /**
   * Remove an editor from a document
   * @param documentId - Document identifier
   * @param userName - User name to remove from editors set
   */
  removeEditor(documentId: string, userName: string): void {
    const metadata = this.documents.get(documentId);
    if (metadata) {
      metadata.editors.delete(userName);

      // If no editors remain, we could unregister after some time
      // For now, keep the document registered
    }
  }

  /**
   * Get all registered documents
   * @returns Array of [documentId, metadata] pairs
   */
  getAllDocuments(): Array<[string, DocumentMetadata]> {
    return Array.from(this.documents.entries());
  }

  /**
   * Mark a document as being saved
   * @param documentId - Document identifier
   */
  markSaving(documentId: string): void {
    const metadata = this.documents.get(documentId);
    if (metadata) {
      metadata.isSaving = true;
    }
  }

  /**
   * Mark a document as saved with updated SHA
   * @param documentId - Document identifier
   * @param newSha - New SHA from GitHub after save
   */
  markSaved(documentId: string, newSha: string): void {
    const metadata = this.documents.get(documentId);
    if (metadata) {
      metadata.isSaving = false;
      metadata.sha = newSha;
      metadata.lastSaved = new Date();
    }
  }

  /**
   * Mark a document save as failed (allows retry)
   * @param documentId - Document identifier
   */
  markSaveFailed(documentId: string): void {
    const metadata = this.documents.get(documentId);
    if (metadata) {
      metadata.isSaving = false;
    }
  }

  /**
   * Get document metadata by ID
   * @param documentId - Document identifier
   * @returns Document metadata or undefined if not found
   */
  getDocument(documentId: string): DocumentMetadata | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Update the SHA for a document (e.g., after conflict resolution)
   * @param documentId - Document identifier
   * @param newSha - New SHA value
   */
  updateSha(documentId: string, newSha: string): void {
    const metadata = this.documents.get(documentId);
    if (metadata) {
      metadata.sha = newSha;
    }
  }

  /**
   * Unregister a document
   * @param documentId - Document identifier
   */
  unregisterDocument(documentId: string): void {
    this.documents.delete(documentId);
  }

  /**
   * Get all registered document IDs
   * @returns Array of document IDs
   */
  getAllDocumentIds(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Get count of registered documents
   * @returns Number of documents being tracked
   */
  getDocumentCount(): number {
    return this.documents.size;
  }
}

// Singleton instance
export const documentStateService = new DocumentStateService();
