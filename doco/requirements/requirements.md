# PRD: Multi-User Collaborative Markdown Editor

## Introduction

A real-time collaborative markdown editor that allows multiple users to edit documents simultaneously with seamless synchronization, similar to Google Docs or Microsoft Teams documents. The system will eventually be backed by GitHub for version control and storage, with automatic commits that are transparent to users. Users will also be able to add review comments in sidebar threads to facilitate collaboration and feedback.

This PRD outlines a phased approach to building the product:
- **PoC (Proof of Concept):** Prove that real-time collaborative editing works with minimal features
- **MVP (Minimum Viable Product):** Production-ready version with authentication, GitHub integration, and comments
- **Horizon 1:** Future enhancements and advanced features

## Overall Goals

- Enable real-time collaborative editing of markdown documents with multiple concurrent users
- Provide seamless GitHub integration with automatic background commits (no manual Git operations)
- Implement sidebar comment threads for document reviews and discussions
- Support basic markdown formatting (headings, bold, italic, lists, links)
- Authenticate users securely, starting with simple name-based auth and evolving to SSO
- Ensure conflict-free editing experience through operational transformation or similar real-time sync technology

---

# Phase Breakdown

## PoC (Proof of Concept)

**Goal:** Prove that real-time collaborative editing works with minimal complexity.

**Scope:**
- Simple name-only authentication (no password, no SSO)
- Single document or very basic document access
- Real-time collaborative editing with OT/CRDT
- Cursor positions and user presence visible
- Basic markdown editor with live preview
- In-memory or local file storage (NO GitHub integration yet)
- NO commenting system

**Success Criteria:**
- Multiple users can edit the same document simultaneously in different browsers
- Changes sync in real-time (<1 second latency)
- No merge conflicts occur
- Users can see each other's cursors and names

## MVP (Minimum Viable Product)

**Goal:** Production-ready collaborative editor with essential features.

**Scope:**
- Gmail SSO authentication (replace name-only login)
- Proper session management and security
- Document management (create, list, open multiple documents)
- GitHub integration with automatic commits
- Save status indicators
- Complete commenting system (add, reply, resolve, delete)
- Persistent storage in GitHub repository

**Success Criteria:**
- Secure user authentication via Google OAuth
- Documents persist in GitHub with automatic commits
- Users can create/manage multiple documents
- Comment threads enable effective collaboration
- System is production-ready and reliable

## Horizon 1 (Future Enhancements)

**Goal:** Advanced features and scalability improvements.

**Scope:**
- Additional SSO providers (Microsoft, GitHub, password-based auth)
- Advanced markdown features (diagrams/Mermaid, tables, code blocks with syntax highlighting)
- Version history UI (browse GitHub commit history)
- Document permissions and sharing controls
- Folders/categories for document organization
- Notifications (email/push for comments and mentions)
- Offline editing support
- Export to PDF/HTML
- Search across documents

---

# User Stories by Phase

## PoC Phase

### US-POC-001: Simple name-based authentication
**Description:** As a user, I want to enter my name to start editing so that I can quickly test collaborative editing without complex login.

**Acceptance Criteria:**
- [ ] Landing page with "Enter your name" text input
- [ ] Name stored in browser session (localStorage or sessionStorage)
- [ ] User directed to editor immediately after entering name
- [ ] No password required
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-POC-002: Basic markdown editor interface
**Description:** As a user, I want a clean editor interface with markdown preview so that I can write and see formatted output.

**Acceptance Criteria:**
- [ ] Split-pane editor: markdown source on left, live preview on right
- [ ] Markdown renders with basic formatting: headings (h1-h6), bold, italic, lists (ordered/unordered), links
- [ ] Preview updates in real-time as user types
- [ ] Optional: Toolbar with formatting buttons (bold, italic, heading, list, link)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-POC-003: Real-time collaborative editing
**Description:** As a user, I want to see other users' changes in real-time so that we can collaborate seamlessly without conflicts.

**Acceptance Criteria:**
- [ ] Multiple users can open the same document simultaneously
- [ ] Changes from one user appear in other users' editors within 1 second
- [ ] Cursor positions of other users are visible with name labels
- [ ] No merge conflicts occur during concurrent editing
- [ ] Operational Transform (OT) or CRDT ensures consistency across all clients
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-POC-004: User presence indicators
**Description:** As a user, I want to see who else is currently editing the document so that I know who I'm collaborating with.

**Acceptance Criteria:**
- [ ] Header shows names of all active users in the document
- [ ] User list updates when someone joins or leaves
- [ ] Each user has a distinct color for their cursor/selection
- [ ] Simple text list or colored badges (no avatars needed for PoC)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-POC-005: In-memory document storage
**Description:** As a developer, I need to store the document in memory so that multiple users can access it without GitHub integration complexity.

**Acceptance Criteria:**
- [ ] Document content stored in server memory (Node.js variable or Redis)
- [ ] Document persists as long as server is running
- [ ] Single hardcoded document OR simple document ID in URL (e.g., `/doc/test`)
- [ ] No database or GitHub integration required
- [ ] Typecheck passes

---

## MVP Phase

### US-MVP-001: User authentication via Gmail SSO
**Description:** As a user, I want to sign in using my Gmail account so that I can access and edit documents securely.

**Acceptance Criteria:**
- [ ] Login page with "Sign in with Google" button
- [ ] OAuth flow redirects to Google and back successfully
- [ ] User profile (name, email, avatar) stored in session
- [ ] Authenticated users redirected to document list/dashboard
- [ ] Unauthenticated users cannot access editor routes
- [ ] Replaces PoC name-based authentication
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-MVP-002: Create new markdown document
**Description:** As a user, I want to create a new markdown document so that I can start writing and collaborating.

**Acceptance Criteria:**
- [ ] "New Document" button visible on dashboard
- [ ] Modal or form to enter document name/title
- [ ] Document created in linked GitHub repository as `.md` file
- [ ] User redirected to editor view after creation
- [ ] Initial commit created in GitHub with message "Created [document-name]"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-MVP-003: View list of available documents
**Description:** As a user, I want to see all documents I have access to so that I can choose which one to edit.

**Acceptance Criteria:**
- [ ] Dashboard displays list of all markdown documents from GitHub repo
- [ ] Each document shows title, last modified date, and last editor
- [ ] Clicking a document opens it in the editor
- [ ] Empty state message when no documents exist
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-MVP-004: Automatic GitHub commits
**Description:** As a user, I want my changes automatically saved to GitHub without manual commits so that I don't lose work.

**Acceptance Criteria:**
- [ ] Changes auto-save to GitHub every 30 seconds (or configurable interval)
- [ ] Commit message includes timestamp and list of active editors
- [ ] Users never see Git commands or branching UI
- [ ] Visual indicator shows "Saving..." and "All changes saved" status
- [ ] No data loss if user closes browser before save completes (buffered changes)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-MVP-005: Add sidebar comment thread
**Description:** As a user, I want to add comments on specific parts of the document so that I can provide feedback and discuss changes with collaborators.

**Acceptance Criteria:**
- [ ] User can select text and click "Add Comment" button
- [ ] Sidebar panel opens showing comment thread for that selection
- [ ] Comment includes author name, avatar, timestamp, and text content
- [ ] Highlighted text in editor shows indicator (e.g., colored underline) that comment exists
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-MVP-006: Reply to and resolve comment threads
**Description:** As a user, I want to reply to comments and mark them as resolved so that discussions can progress and be closed.

**Acceptance Criteria:**
- [ ] "Reply" button in each comment thread
- [ ] Replies appear chronologically in thread
- [ ] "Resolve" button marks thread as resolved
- [ ] Resolved threads visually distinguished (collapsed or grayed out)
- [ ] Option to show/hide resolved threads
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-MVP-007: Delete comments
**Description:** As a comment author, I want to delete my own comments so that I can remove outdated or incorrect feedback.

**Acceptance Criteria:**
- [ ] "Delete" button visible only to comment author
- [ ] Confirmation dialog before deletion
- [ ] Deleted comment removed from thread and storage
- [ ] If all comments in a thread are deleted, thread is removed entirely
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Horizon 1 Phase

User stories for Horizon 1 features will be defined when this phase is planned. Key areas include:
- Additional SSO providers and password-based authentication
- Advanced markdown features (diagrams, tables, code blocks)
- Version history browser UI
- Document permissions and sharing controls
- Notifications system
- Offline editing support

---

# Functional Requirements by Phase

## PoC Phase Requirements

### Authentication (PoC)
- **FR-POC-1:** The system must allow users to enter a display name without password authentication
- **FR-POC-2:** User names must be stored in browser session storage (no server-side session management required)

### Document Storage (PoC)
- **FR-POC-3:** Document content must be stored in server memory (in-memory data structure or Redis)
- **FR-POC-4:** System may use a single hardcoded document OR simple document ID routing (e.g., `/doc/:id`)
- **FR-POC-5:** Document persistence only required for server uptime duration (acceptable to lose data on restart)

### Real-Time Editing (PoC)
- **FR-POC-6:** The system must support multiple concurrent users editing the same document simultaneously
- **FR-POC-7:** The system must use Operational Transform (OT) or CRDTs to ensure conflict-free merging of concurrent edits
- **FR-POC-8:** Changes from any user must propagate to all other users within 1 second
- **FR-POC-9:** The system must display cursor positions and selections of all active users with distinct colors and name labels

### Markdown Support (PoC)
- **FR-POC-10:** The editor must support basic markdown syntax: headings (h1-h6), bold (`**text**`), italic (`*text*`), ordered lists, unordered lists, and links
- **FR-POC-11:** The editor must provide a live preview pane that renders markdown in real-time
- **FR-POC-12:** Optional: Toolbar with buttons for common formatting operations

### User Presence (PoC)
- **FR-POC-13:** The system must show a list of all users currently viewing/editing the document
- **FR-POC-14:** User presence indicators must update in real-time as users join or leave
- **FR-POC-15:** Each user must be identified by their entered name and assigned a distinct color

---

## MVP Phase Requirements

### Authentication & Authorization (MVP)
- **FR-MVP-1:** The system must authenticate users via Google OAuth (Gmail SSO)
- **FR-MVP-2:** The system must store user sessions securely with encrypted cookies or JWTs
- **FR-MVP-3:** The system must restrict document access to authenticated users only
- **FR-MVP-4:** The authentication architecture must be extensible to support additional SSO providers in future phases

### Document Management (MVP)
- **FR-MVP-5:** Each document must be stored as a `.md` file in a designated GitHub repository
- **FR-MVP-6:** The system must fetch and display a list of all documents from the GitHub repository
- **FR-MVP-7:** The system must allow users to create new markdown documents with a title/filename
- **FR-MVP-8:** Document metadata (last modified, last editor) must be tracked and displayed
- **FR-MVP-9:** Replace PoC in-memory storage with persistent GitHub storage

### Real-Time Editing (MVP)
- **FR-MVP-10:** Inherit all real-time editing requirements from PoC (FR-POC-6 through FR-POC-9)
- **FR-MVP-11:** Real-time edits must be reconciled with GitHub storage (OT/CRDT state + periodic GitHub commits)

### Markdown Support (MVP)
- **FR-MVP-12:** Inherit all markdown support from PoC (FR-POC-10 through FR-POC-12)
- **FR-MVP-13:** Toolbar with formatting buttons becomes mandatory (no longer optional)

### GitHub Integration (MVP)
- **FR-MVP-14:** The system must automatically commit changes to GitHub at regular intervals (e.g., every 30 seconds)
- **FR-MVP-15:** Commit messages must include timestamp and list of active users who made changes
- **FR-MVP-16:** The system must handle GitHub API rate limits gracefully
- **FR-MVP-17:** Users must see a visual indicator of save status ("Saving...", "All changes saved", "Error saving")

### Commenting System (MVP)
- **FR-MVP-18:** Users must be able to select text and create a comment thread anchored to that selection
- **FR-MVP-19:** Comment threads must appear in a sidebar panel
- **FR-MVP-20:** Each comment must display author name, avatar, timestamp, and content
- **FR-MVP-21:** Users must be able to reply to existing comment threads
- **FR-MVP-22:** Users must be able to mark comment threads as "Resolved"
- **FR-MVP-23:** Users must be able to delete their own comments
- **FR-MVP-24:** Resolved comment threads must be visually distinguished and collapsible
- **FR-MVP-25:** Comments must persist in database or GitHub (stored as JSON in `.comments/` folder or database)

### User Presence (MVP)
- **FR-MVP-26:** Inherit PoC presence requirements (FR-POC-13 through FR-POC-15)
- **FR-MVP-27:** User presence must display Google profile avatars instead of simple text
- **FR-MVP-28:** User presence must show authenticated user identity (name from Google account)

---

## Horizon 1 Phase Requirements

Functional requirements for Horizon 1 will be defined when that phase is planned. Expected areas:

### Additional Authentication (Horizon 1)
- Support for Microsoft SSO, GitHub SSO, password-based authentication
- Multi-factor authentication (MFA)

### Advanced Markdown (Horizon 1)
- Diagrams (Mermaid, PlantUML)
- Tables with sorting/filtering
- Code blocks with syntax highlighting
- Task lists / checkboxes
- Math equations (LaTeX)

### Version History (Horizon 1)
- UI to browse GitHub commit history
- Diff view between versions
- Restore previous versions

### Permissions & Sharing (Horizon 1)
- Document-level access control (read/write/admin)
- Public/private document toggle
- Share links with expiration

### Notifications (Horizon 1)
- Email notifications for comments and mentions
- In-app notification center
- Push notifications (PWA)

### Additional Features (Horizon 1)
- Folders/categories for document organization
- Global search across all documents
- Offline editing with sync when online
- Export to PDF/HTML/DOCX
- Document templates

---

# Non-Goals (Out of Scope)

These features are explicitly out of scope for all phases of this project:

- **Mobile native apps:** Web-based only (responsive design acceptable)
- **Rich text (WYSIWYG) editor mode:** Markdown source editing only
- **Real-time voice/video chat:** Communication through comments only
- **Integrations with tools other than GitHub:** No Notion, Confluence, or other platform syncs
- **AI-powered features:** No auto-completion, grammar checking, or content generation
- **Spreadsheet/table editor:** Tables rendered as markdown only, no Excel-like editing
- **Presentation mode:** Focus on document editing, not slideshow creation

## Design Considerations

### UI/UX Requirements
- **Clean, minimal interface:** Focus on content, reduce UI clutter
- **Responsive design:** Should work on desktop and tablet (mobile is non-goal but should degrade gracefully)
- **Split-pane editor:** Markdown source on left, preview on right (or toggle view)
- **Sidebar for comments:** Slides in from right, doesn't obstruct main editor
- **User avatars:** Use Google profile pictures for authenticated users
- **Color coding:** Each collaborator gets a distinct color for cursor and highlights

### Accessibility
- Keyboard shortcuts for common formatting actions
- Proper ARIA labels for screen readers
- High contrast mode support

## Technical Considerations

### Architecture
- **Frontend:** React or Vue.js with TypeScript
- **Backend:** Node.js (Express or NestJS) or Python (FastAPI)
- **Real-time sync:** WebSocket server (Socket.io or native WebSockets) for OT/CRDT
- **Database:** PostgreSQL or MongoDB for comments, user sessions, and metadata (documents themselves stored in GitHub)
- **GitHub API:** Use Octokit or REST API for repository operations

### GitHub Integration
- **Repository structure:** Single repo with all `.md` files at root or in `/documents` folder
- **Comment storage:** Store comments in a separate JSON file (e.g., `.comments/document-name.json`) or in a database
- **Commit strategy:** Batch changes from multiple users into single commits every N seconds to avoid excessive commit history
- **Authentication:** Use GitHub App or OAuth app with appropriate scopes (repo read/write)

### Real-Time Sync
- **OT Library:** Consider using ShareDB, Yjs, or Automerge for CRDT/OT implementation
- **Conflict resolution:** Operational Transform ensures character-level merging without conflicts
- **Network resilience:** Handle reconnection gracefully, queue changes during disconnection

### Performance
- **Document size limit:** Start with reasonable limits (e.g., 1MB per document) to ensure real-time sync performance
- **Concurrent users:** Support at least 10 concurrent users per document without degradation
- **WebSocket connection pooling:** Optimize server resources for many simultaneous documents

### Security
- **OAuth security:** Validate OAuth tokens, use HTTPS only
- **Rate limiting:** Prevent abuse of GitHub API and WebSocket connections
- **Input sanitization:** Prevent XSS in markdown preview and comments
- **CSRF protection:** Use tokens for state-changing operations

---

# Success Metrics

## PoC Success Metrics
- **Real-time sync works:** Multiple users can edit simultaneously without merge conflicts
- **Sub-second latency:** Changes propagate to all users within 1 second
- **Concurrent user support:** At least 3-5 users can edit the same document simultaneously
- **Stability:** PoC runs for 30+ minutes without crashes or data corruption

## MVP Success Metrics
- **Collaboration effectiveness:** Users can edit documents concurrently without experiencing merge conflicts or data loss
- **Sync latency:** Changes propagate to all users within 1 second under normal network conditions
- **Auto-save reliability:** 99.9% of edits successfully committed to GitHub without user intervention
- **User adoption:** Users prefer this tool over manual Git workflows for collaborative markdown editing
- **Comment engagement:** At least 30% of documents have at least one comment thread (indicating review/collaboration usage)
- **Authentication success rate:** 99%+ of OAuth login attempts succeed
- **Document accessibility:** Users can access any document from the GitHub repo within 2 seconds

## Horizon 1 Success Metrics
- To be defined based on feature set implemented

---

# Open Questions

## Questions for MVP Phase Planning

**Note:** PoC technical decisions have been finalized in the [Technical Design document](../tech-design.md). The following questions remain open for MVP phase planning:
1. **GitHub repository setup:** Should each user have their own repo, or should all users share a single organization repo?
   - *Recommendation:* Start with single shared repo for simplicity, add multi-repo support in Horizon 1

2. **Comment anchoring:** How do comments remain anchored when the document text changes around them?
   - *Recommendation:* Use Yjs relative positions or line/character offsets with smart re-anchoring logic

3. **Maximum concurrent users:** What's the upper limit of simultaneous editors per document?
   - *Recommendation:* Start with 10-20 user limit for MVP, test and optimize in Horizon 1

4. **GitHub branch strategy:** Should auto-commits go to main branch or per-user branches?
   - *Recommendation:* Main branch for MVP (like Google Docs single source of truth), branching adds complexity

5. **Comment storage:** Database vs GitHub storage for comments?
   - *Recommendation:* Database (PostgreSQL) for faster queries and easier iteration

## Horizon 1 Questions
- To be defined when Horizon 1 planning begins

---

# Implementation Notes

## PoC Implementation Approach
1. **Start with basic WebSocket server and simple name-based authentication**
   - Express.js + Socket.io or vanilla WebSockets
   - Store user names in connection metadata

2. **Integrate Yjs (recommended OT/CRDT library)**
   - Use `y-websocket` for WebSocket provider
   - Use `y-monaco` or basic textarea for editor
   - Store document in memory with Yjs Y.Doc

3. **Add basic markdown preview**
   - Use `marked` or `react-markdown` for rendering
   - Split-pane layout with CodeMirror or Monaco editor

4. **Implement cursor sharing**
   - Use Yjs awareness API for cursor positions
   - Assign random colors to each user

5. **Test with multiple browser windows locally**
   - Open 3-5 browser tabs to simulate multi-user editing
   - Verify real-time sync and conflict resolution

**PoC Duration Estimate:** 2-4 days of focused development

## MVP Implementation Approach
1. **Set up Google OAuth and session management**
   - Use Passport.js or NextAuth for OAuth
   - Store sessions in Redis or database

2. **Integrate GitHub API**
   - Use Octokit for GitHub operations
   - Set up webhook or polling for external changes (optional)

3. **Build document management UI**
   - Dashboard with document list
   - Create/open document flows
   - GitHub sync on document load/save

4. **Migrate PoC real-time editing to production architecture**
   - Keep Yjs for real-time sync
   - Add periodic GitHub commit logic (background job)
   - Reconcile Yjs state with GitHub on document open

5. **Implement commenting system**
   - Database schema for comments
   - Sidebar UI component
   - Comment anchoring logic with Yjs integration

6. **Add user avatars and polish presence indicators**
   - Fetch Google profile pictures
   - Improve UI/UX from PoC

**MVP Duration Estimate:** 2-4 weeks of development

## Horizon 1 Implementation Approach
- To be defined when Horizon 1 planning begins

---

# Quick Reference: What Gets Built in Each Phase

## PoC Deliverables
✅ Simple name-based login (no password)
✅ Real-time collaborative editing with OT/CRDT
✅ Cursor positions and user presence
✅ Basic markdown editor with live preview
✅ In-memory document storage
✅ Works for 3-5 concurrent users

**Goal:** Prove the concept works before investing in production features

## MVP Deliverables
✅ Gmail SSO authentication
✅ Document list and creation UI
✅ GitHub integration with auto-commits
✅ Save status indicators
✅ Complete commenting system (add/reply/resolve/delete)
✅ User avatars from Google profiles
✅ Production-ready deployment

**Goal:** Ship a production-ready collaborative editor

## Horizon 1 Deliverables (Future)
🔮 Additional SSO providers
🔮 Advanced markdown (diagrams, tables, code blocks)
🔮 Version history browser
🔮 Document permissions
🔮 Notifications
🔮 Offline editing

**Goal:** Enterprise-grade features and scalability
