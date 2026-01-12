# PRD: Multi-User Collaborative Markdown Editor

> **Note:** This document provides a high-level overview. For detailed user stories, acceptance criteria, functional requirements, and implementation status, see [prd.json](../../scripts/ralph/prd.json).

## Introduction

A real-time collaborative markdown editor that allows multiple users to edit documents simultaneously with seamless synchronization, similar to Google Docs or Microsoft Teams documents. The system is backed by GitHub for version control and storage, with automatic commits that are transparent to users. Users can also add review comments in sidebar threads to facilitate collaboration and feedback.

### Development Phases
- **PoC (Proof of Concept):** ✅ **Completed** - Proved real-time collaborative editing works
- **MVP (Minimum Viable Product):** ✅ **Completed** - GitHub integration, authentication, and comments
- **Horizon 1:** 🔮 **Future** - Advanced features and enhancements

## Goals

- Enable real-time collaborative editing of markdown documents with multiple concurrent users
- Provide seamless GitHub integration with automatic background commits (no manual Git operations)
- Implement sidebar comment threads for document reviews and discussions
- Support markdown formatting with live preview
- Authenticate users securely via GitHub OAuth
- Ensure conflict-free editing through Yjs CRDT technology

## Non-Goals

These features are explicitly out of scope:
- Mobile native apps (web-based only)
- Rich text WYSIWYG editor (markdown source only)
- Real-time voice/video chat
- Integrations with tools other than GitHub
- AI-powered features
- Spreadsheet/table editor
- Presentation mode

## Architecture Overview

- **Frontend:** React with TypeScript and Vite
- **Backend:** Node.js with Express and TypeScript
- **Real-time sync:** Yjs CRDT with WebSocket (y-websocket)
- **Database:** PostgreSQL (users, comments, metadata)
- **Storage:** GitHub (markdown documents)
- **Authentication:** GitHub OAuth with AES-256-GCM encrypted token storage
- **Session Store:** Redis

## Phase Deliverables

### PoC - Completed ✅
- Simple name-based login
- Real-time collaborative editing with Yjs CRDT
- Cursor positions and user presence
- Basic markdown editor with live preview
- In-memory document storage
- Supports 3-5 concurrent users

### MVP - Completed ✅
- GitHub OAuth authentication with encrypted token storage
- Repository selection and folder navigation
- Document list and creation UI
- Automatic GitHub commits with conflict resolution
- Complete commenting system (add/reply/resolve/delete)
- GitHub profile avatars in user presence
- Manual save button with Ctrl+S shortcut

### Horizon 1 - Future 🔮
- Additional SSO providers (Microsoft, password-based auth)
- Advanced markdown (Mermaid diagrams, tables, syntax highlighting)
- Version history browser UI
- Document permissions and sharing
- Notifications (email/push)
- Offline editing support
- Export to PDF/HTML
- Search across documents

## Key Technical Decisions

**Authentication:** Changed from Gmail SSO (original plan) to GitHub OAuth to provide seamless integration with GitHub repositories.

**Token Security:** GitHub access tokens are encrypted with AES-256-GCM before storage in PostgreSQL to protect user credentials.

**Conflict Resolution:** Automatic conflict handling for GitHub commits - system fetches latest SHA and retries on 409 conflicts, ensuring no data loss.

**Comment Anchoring:** Comments use character offsets with Yjs position tracking for automatic updates when surrounding text changes.

**Commit Strategy:** Batch changes from multiple editors into single commits every 30-60 seconds with messages listing all active editors.

## Success Metrics

### PoC Metrics (Achieved ✅)
- Real-time sync with <1 second latency
- 3-5 concurrent users without conflicts
- 30+ minutes stability without crashes

### MVP Target Metrics
- 99.9% auto-save reliability to GitHub
- <1 second sync latency under normal conditions
- 99%+ OAuth login success rate
- <2 seconds document access time
- 30%+ documents with comment threads

## Documentation Structure

- **requirements.md** (this file): High-level overview and context
- **[prd.json](../../scripts/ralph/prd.json)**: Detailed user stories, acceptance criteria, functional requirements, implementation status
- **[design/hld.md](../design/hld.md)**: Technical architecture and design decisions
- **[Repository Guidelines](../repository-guidelines.md)**: Code structure and standards

---

For detailed user stories, acceptance criteria, and implementation tracking, see [prd.json](../../scripts/ralph/prd.json).
