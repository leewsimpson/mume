import { documentStateService } from '../services/documentState.service.js';
import { GitHubService, type Logger } from '../services/github.service.js';
import * as Y from 'yjs';

const githubService = new GitHubService();

// y-websocket stores docs in a map but doesn't export types for it
// We need to access it dynamically
let yjsDocs: Map<string, YjsDocEntry> | undefined;
try {
  const yjsUtils = await import('y-websocket/bin/utils');
  yjsDocs = (yjsUtils as {docs?: Map<string, YjsDocEntry>}).docs;
} catch (err) {
  console.error('Failed to import y-websocket docs:', err);
}

// Interval for checking and committing changes (30 seconds)
const SYNC_INTERVAL_MS = 30000;

// Maximum retries for conflict resolution
const MAX_CONFLICT_RETRIES = 3;

// Type for y-websocket docs map entry
// Note: doc may be undefined if the document hasn't been fully initialized
interface YjsDocEntry {
  name: string;
  doc?: Y.Doc;
}

/**
 * Format commit message with timestamp and editor names
 * @param filePath - File path being updated
 * @param editors - Set of user names who edited the document
 * @returns Formatted commit message
 */
function formatCommitMessage(filePath: string, editors: Set<string>): string {
  const timestamp = new Date().toISOString();
  const editorList = editors.size > 0 ? Array.from(editors).join(', ') : 'Collaborative edit';
  const filename = filePath.split('/').pop() || filePath;

  return `Update ${filename} - ${timestamp} - Editors: ${editorList}`;
}

/**
 * Check if a Y.Doc has been modified since a given timestamp
 * This is a simple heuristic - in production, you'd track actual dirty state
 * @param ydoc - Y.Doc instance
 * @param lastSaved - Last save timestamp
 * @returns True if document appears to have changes
 */
function hasChanges(ydoc: Y.Doc, lastSaved: Date): boolean {
  // Simple heuristic: if the document was modified in the last sync interval, consider it dirty
  // In a more robust implementation, we'd track the actual update state
  const ytext = ydoc.getText('content');
  
  if (!ytext) {
    return false;
  }
  
  const content = ytext.toString();

  // If document has content and hasn't been saved recently, consider it dirty
  const timeSinceLastSave = Date.now() - lastSaved.getTime();
  return content.length > 0 && timeSinceLastSave > SYNC_INTERVAL_MS;
}

/**
 * Attempt to save a document to GitHub with conflict resolution
 * @param documentId - Document identifier
 * @param logger - Optional logger
 * @returns True if save succeeded, false otherwise
 */
export async function saveDocumentWithRetry(
  documentId: string,
  logger?: Logger
): Promise<boolean> {
  const metadata = documentStateService.getDocument(documentId);
  if (!metadata) {
    logger?.warn('Document metadata not found', { documentId });
    return false;
  }

  // Get Y.Doc from y-websocket's docs map
  if (!yjsDocs) {
    logger?.warn('y-websocket docs map not available', { documentId });
    return false;
  }

  const docEntry = yjsDocs.get(documentId);

  if (!docEntry || !docEntry.doc) {
    logger?.warn('Y.Doc not found in y-websocket docs map', { documentId });
    return false;
  }

  const { owner, repo, filePath, sha, token, editors } = metadata;
  const ydoc = docEntry.doc;

  // Get current content from Yjs document
  const ytext = ydoc.getText('content');
  const content = ytext.toString();

  // Generate commit message
  const message = formatCommitMessage(filePath, editors);

  logger?.info('Attempting to save document to GitHub', {
    documentId,
    owner,
    repo,
    filePath,
    contentLength: content.length,
    editors: Array.from(editors),
  });

  // Attempt save with retry logic for conflicts
  for (let attempt = 1; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
    try {
      const currentSha = documentStateService.getDocument(documentId)?.sha || sha;

      const result = await githubService.updateFile(
        owner,
        repo,
        filePath,
        content,
        currentSha,
        message,
        token,
        logger
      );

      // Success! Update document state
      documentStateService.markSaved(documentId, result.sha);

      logger?.info('Successfully saved document to GitHub', {
        documentId,
        owner,
        repo,
        filePath,
        newSha: result.sha,
        commitSha: result.commit,
        attempt,
      });

      return true;
    } catch (error) {
      // Check if it's a 409 conflict error
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 409) {
        logger?.warn('Conflict detected, attempting to resolve', {
          documentId,
          owner,
          repo,
          filePath,
          attempt,
          maxRetries: MAX_CONFLICT_RETRIES,
        });

        if (attempt < MAX_CONFLICT_RETRIES) {
          // Fetch latest file content and SHA from GitHub
          try {
            const latestFile = await githubService.getFileContent(owner, repo, filePath, token, logger);

            // Update SHA in document state
            documentStateService.updateSha(documentId, latestFile.sha);

            logger?.info('Updated document SHA after conflict', {
              documentId,
              newSha: latestFile.sha,
              attempt,
            });

            // Note: We don't merge the content here because Yjs CRDT already handles
            // conflict-free merging at the character level. We just need the latest SHA
            // to retry the commit. The Y.Doc contains the converged state from all editors.

            // Wait a bit before retrying (exponential backoff)
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffMs));

            // Retry with new SHA
            continue;
          } catch (fetchError) {
            logger?.error(
              'Failed to fetch latest file content during conflict resolution',
              fetchError instanceof Error ? fetchError : new Error(String(fetchError)),
              {
                documentId,
                owner,
                repo,
                filePath,
                attempt,
              }
            );
            break;
          }
        } else {
          logger?.error(
            'Max conflict resolution retries exceeded',
            new Error('Failed to resolve conflict after max retries'),
            {
              documentId,
              owner,
              repo,
              filePath,
              maxRetries: MAX_CONFLICT_RETRIES,
            }
          );
          break;
        }
      } else {
        // Non-conflict error, log and fail
        logger?.error(
          'Failed to save document to GitHub',
          error instanceof Error ? error : new Error(String(error)),
          {
            documentId,
            owner,
            repo,
            filePath,
            attempt,
          }
        );
        break;
      }
    }
  }

  // Save failed
  documentStateService.markSaveFailed(documentId);
  return false;
}

/**
 * Background job that runs periodically to sync modified documents to GitHub
 * @param logger - Optional logger
 */
export async function runGitHubSync(logger?: Logger): Promise<void> {
  // Silent run - only log when there's actual work to do

  const registeredDocs = documentStateService.getAllDocuments();

  if (registeredDocs.length === 0) {
    return;
  }

  // Check if y-websocket docs map is available
  if (!yjsDocs) {
    logger?.warn('y-websocket docs map not available');
    return;
  }

  // Filter to documents that have changes and are not currently being saved
  const docsToSync = registeredDocs.filter(([documentId, metadata]) => {
    if (metadata.isSaving) {
      return false;
    }

    // Get Y.Doc from y-websocket
    const docEntry = yjsDocs!.get(documentId);

    if (!docEntry || !docEntry.doc) {
      return false;
    }

    // Check if document has changes
    return hasChanges(docEntry.doc, metadata.lastSaved);
  });

  if (docsToSync.length === 0) {
    return;
  }

  logger?.info('Found documents to sync', {
    count: docsToSync.length,
    documents: docsToSync.map(([_, meta]) => meta.filePath),
  });

  // Process each dirty document
  const results = await Promise.allSettled(
    docsToSync.map(([documentId, _]) => {
      documentStateService.markSaving(documentId);
      return saveDocumentWithRetry(documentId, logger);
    })
  );

  // Log summary
  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - succeeded;

  if (succeeded > 0 || failed > 0) {
    logger?.info('GitHub sync job completed', {
      total: results.length,
      succeeded,
      failed,
    });
  }

  if (failed > 0) {
    logger?.warn('Some documents failed to sync', { failedCount: failed });
  }
}

/**
 * Start the background sync job with periodic execution
 * @param logger - Optional logger
 * @returns Interval ID (can be used to stop the job)
 */
export function startGitHubSyncJob(logger?: Logger): NodeJS.Timeout {
  console.log('Starting GitHub sync background job', {
    intervalMs: SYNC_INTERVAL_MS,
  });

  // Run immediately on start
  runGitHubSync(logger).catch(err => {
    console.error('GitHub sync job failed:', err);
  });

  // Schedule periodic execution
  const intervalId = setInterval(() => {
    runGitHubSync(logger).catch(err => {
      console.error('GitHub sync job failed:', err);
    });
  }, SYNC_INTERVAL_MS);

  return intervalId;
}

/**
 * Stop the background sync job
 * @param intervalId - Interval ID returned from startGitHubSyncJob
 */
export function stopGitHubSyncJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log('Stopped GitHub sync background job');
}
