import { documentStateService } from '../services/documentState.service.js';
import { GitHubService, type Logger } from '../services/github.service.js';
import * as Y from 'yjs';

const githubService = new GitHubService();

// y-websocket stores docs in a map but doesn't export types for it
// We need to access it dynamically
// Note: y-websocket stores Y.Doc instances directly in the map, not wrapped in objects
let yjsDocs: Map<string, Y.Doc> | undefined;
try {
  const yjsUtils = await import('y-websocket/bin/utils');
  yjsDocs = (yjsUtils as {docs?: Map<string, Y.Doc>}).docs;
} catch (err) {
  console.error('Failed to import y-websocket docs:', err);
}

// Interval for checking and committing changes (30 seconds)
const SYNC_INTERVAL_MS = 30000;

// Track which documents already have update listeners attached
const documentsWithListeners = new Set<string>();

/**
 * Attach an update listener to a Y.Doc to track changes
 * @param documentId - Document identifier
 * @param ydoc - Y.Doc instance
 */
function attachUpdateListener(documentId: string, ydoc: Y.Doc): void {
  if (documentsWithListeners.has(documentId)) {
    return; // Already has a listener
  }

  // Listen for updates to the document
  // The 'update' event fires when any change is made to the Y.Doc
  ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
    // Skip updates that originate from persistence (loading initial state)
    // Only mark as changed for updates from WebSocket sync (origin will be the connection)
    if (origin !== null && origin !== undefined) {
      documentStateService.markChanged(documentId);
    }
  });

  documentsWithListeners.add(documentId);
}

// Maximum retries for conflict resolution
const MAX_CONFLICT_RETRIES = 3;

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
 * Check if a document has unsaved changes by examining metadata
 * @param documentId - Document identifier
 * @returns True if document has unsaved changes
 */
function hasChanges(documentId: string): boolean {
  const metadata = documentStateService.getDocument(documentId);
  if (!metadata) {
    return false;
  }
  return metadata.hasUnsavedChanges;
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
  console.log('[SAVE_RETRY] Starting save for:', documentId);
  
  const metadata = documentStateService.getDocument(documentId);
  if (!metadata) {
    console.log('[SAVE_RETRY] ERROR: Document metadata not found for:', documentId);
    logger?.warn('Document metadata not found', { documentId });
    return false;
  }

  console.log('[SAVE_RETRY] Metadata found:', { owner: metadata.owner, repo: metadata.repo, filePath: metadata.filePath });

  // Get Y.Doc from y-websocket's docs map
  if (!yjsDocs) {
    console.log('[SAVE_RETRY] ERROR: y-websocket docs map not available');
    logger?.warn('y-websocket docs map not available', { documentId });
    return false;
  }

  console.log('[SAVE_RETRY] y-websocket docs map size:', yjsDocs.size);

  // Get Y.Doc from map (y-websocket stores Y.Doc instances directly)
  let ydoc = yjsDocs.get(documentId);
  let retries = 0;
  const maxRetries = 10; // 10 retries = 5 seconds max wait
  
  // Wait for Y.Doc to be created (handle race condition)
  while (!ydoc && retries < maxRetries) {
    console.log('[SAVE_RETRY] Waiting for Y.Doc creation, attempt:', retries + 1);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    ydoc = yjsDocs.get(documentId);
    retries++;
  }

  if (!ydoc) {
    console.log('[SAVE_RETRY] ERROR: Y.Doc not found after waiting.');
    console.log('[SAVE_RETRY] Available doc IDs:', Array.from(yjsDocs.keys()));
    logger?.warn('Y.Doc not found in y-websocket docs map after retries', { documentId, retries });
    return false;
  }

  console.log('[SAVE_RETRY] Y.Doc found, proceeding with save');

  const { owner, repo, filePath, sha, token, editors } = metadata;

  // Get current content from Yjs document
  const ytext = ydoc.getText('content');
  const content = ytext.toString();

  console.log('[SAVE_RETRY] Content extracted, length:', content.length);

  // Generate commit message
  const message = formatCommitMessage(filePath, editors);

  console.log('[SAVE_RETRY] Commit message:', message);

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
      console.log('[SAVE_RETRY] Attempt', attempt, 'with SHA:', currentSha);

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
      console.log('[SAVE_RETRY] Save successful! New SHA:', result.sha);
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
        console.error('[SAVE_RETRY] Non-conflict error:', error);
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

  // Attach update listeners to all registered Y.Docs that we can find
  for (const [documentId] of registeredDocs) {
    const ydoc = yjsDocs.get(documentId);
    if (ydoc) {
      attachUpdateListener(documentId, ydoc);
    }
  }

  // Filter to documents that have changes and are not currently being saved
  const docsToSync = registeredDocs.filter(([documentId, metadata]) => {
    if (metadata.isSaving) {
      return false;
    }

    // Get Y.Doc from y-websocket (stored directly as Y.Doc)
    const ydoc = yjsDocs!.get(documentId);

    if (!ydoc) {
      return false;
    }

    // Check if document has actual unsaved changes
    return hasChanges(documentId);
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
