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

# User Stories and Functional Requirements

**Note:** All detailed user stories and functional requirements have been consolidated into `prd.json` for easier tracking and automation. See [prd.json](../../scripts/ralph/prd.json) for:
- Complete user stories for PoC, MVP, and Horizon 1 phases
- Detailed acceptance criteria for each user story
- All functional requirements organized by phase and category
- Implementation status and notes

## User Story Summary

### PoC Phase
- US-POC-001 through US-POC-005: Basic collaborative editing capabilities
- Focus: Name-based auth, real-time editing, markdown preview, user presence, in-memory storage

### MVP Phase
- US-MVP-001 through US-MVP-007: Production-ready features
- Focus: Gmail SSO, document management, GitHub integration, commenting system

### Horizon 1 Phase
User stories will be defined when this phase is planned. Key areas include:
- Additional SSO providers and password-based authentication
- Advanced markdown features (diagrams, tables, code blocks)
- Version history browser UI
- Document permissions and sharing controls
- Notifications system
- Offline editing support

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
