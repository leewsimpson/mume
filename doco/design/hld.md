# Technical Design: Multi-User Collaborative Markdown Editor

**Last Updated:** 2026-01-11
**Status:** PoC Phase - Decisions Finalized
**Related Documents:** Requirements documentation (to be created in `../requirements/`)

---

## Document Overview

This document captures the key technical decisions and architecture for the multi-user collaborative markdown editor. It focuses on architectural choices, component design, and technology selection rationale.

**Important Note:** These decisions are specific to the **PoC (Proof of Concept) phase**. Technical choices may evolve for MVP and Horizon 1 phases based on lessons learned and changing requirements.

**Scope:** This is a high-level design document. Detailed implementation patterns are maintained in the codebase itself, following the principle that code is the source of truth for implementation details.

---

## PoC Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
├─────────────────────────────────────────────────────────┤
│  React Frontend (TypeScript)                             │
│  ├─ Textarea Editor + Yjs Binding                       │
│  ├─ Markdown Preview (react-markdown)                   │
│  ├─ User Presence UI (names + colors)                   │
│  └─ WebSocket Client (y-websocket)                      │
└─────────────────────────────────────────────────────────┘
                        │
                        │ WebSocket
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Server (Node.js)                    │
├─────────────────────────────────────────────────────────┤
│  Express.js Server (TypeScript)                          │
│  ├─ WebSocket Server (y-websocket)                      │
│  ├─ Simple name-based auth (session storage)            │
│  └─ In-memory document storage (Map<id, Y.Doc>)         │
└─────────────────────────────────────────────────────────┘
```

---

# PoC Technical Decisions

## TD-POC-1: Real-Time Collaboration Library

**Decision:** Yjs

**Reasoning:**
- Best combination of performance, documentation, and ecosystem
- Built-in cursor sharing via Awareness API
- WebSocket provider ready out-of-the-box
- Most active development and community support
- Excellent Yjs documentation with clear examples for AI/developers

**Implementation:**
- Use `yjs` core library
- Use `y-websocket` for WebSocket provider
- Use `y-textarea` or basic Yjs text binding for editor
- Store document as `Y.Doc` in server memory for PoC

---

## TD-POC-2: Frontend Framework

**Decision:** React (with TypeScript)

**Reasoning:**
- Largest ecosystem and community support
- Most documentation and examples available (better for AI assistance)
- Strong TypeScript support
- Team familiarity

**Implementation:**
- Use React 18+ with TypeScript
- Use Vite for fast development builds
- Use functional components with hooks
- No complex state management needed (Context + Hooks sufficient for PoC)

---

## TD-POC-3: Markdown Editor Component

**Decision:** Basic Textarea with Yjs binding for PoC

**Reasoning:**
- **PoC Goal:** Prove real-time collaboration works, not build perfect editor
- Simplest possible implementation - can build PoC in hours
- Direct Yjs binding is straightforward (`Y.Text` + textarea)
- Excellent community examples and documentation
- Minimal bundle size
- Easy upgrade path to CodeMirror 6 or Monaco for MVP

**Note:** This is a **markdown document editor**, not a code editor. For MVP, we'll upgrade to CodeMirror 6 for better markdown editing experience.

**Implementation:**
- Use native HTML `<textarea>` element
- Bind Yjs `Y.Text` to textarea value
- Listen to textarea input events and update Yjs
- Listen to Yjs changes and update textarea
- Example pattern available in Yjs documentation

---

## TD-POC-4: Markdown Rendering Library

**Decision:** react-markdown

**Reasoning:**
- React component-based (fits our React choice)
- Safe by default (XSS protection built-in)
- Easy to extend with plugins (remark-gfm for GitHub Flavored Markdown)
- Good documentation and community support

**Implementation:**
- Use `react-markdown` with `remark-gfm` plugin
- Configure to support: headings (h1-h6), bold, italic, lists, links
- Render in split-pane view next to textarea
- Live preview updates as user types

---

## TD-POC-5: Backend Framework

**Decision:** Express.js for PoC (migrate to NestJS for MVP)

**Reasoning:**
- Minimal and flexible - fastest to set up for PoC
- Huge ecosystem and community support
- Easy WebSocket integration with y-websocket
- Well-documented for AI assistance
- Can migrate to NestJS for MVP when we need better structure

**Implementation:**
- Use Express.js with TypeScript
- Integrate y-websocket server
- Minimal routing (just serve static files + WebSocket)
- No authentication complexity in PoC (name-based only)

---

## TD-POC-6: Real-Time Communication

**Decision:** Native WebSockets with y-websocket

**Reasoning:**
- Yjs provides `y-websocket` which is a complete WebSocket provider
- No need for Socket.io complexity in PoC
- Built specifically for Yjs collaboration
- Handles reconnection and sync automatically

**Implementation:**
- Server: Use `y-websocket` server from Yjs
- Client: Use `y-websocket` client provider
- Configure reconnection with exponential backoff
- Handle connection state in UI (connected/disconnected indicator)

---

## TD-POC-7: Document Storage

**Decision:** In-memory Map (server memory)

**Reasoning:**
- Simplest implementation for PoC
- No dependencies or external services
- Fast access
- Acceptable to lose data on server restart (this is PoC)
- Proves real-time sync works without persistence complexity

**Implementation:**
- Store `Y.Doc` instances in a Map: `Map<documentId, Y.Doc>`
- Create Y.Doc on first access if not exists
- Keep documents in memory for duration of server uptime
- Simple document ID routing: `/doc/:id`

---

## TD-POC-8: User Presence

**Decision:** Yjs Awareness API

**Reasoning:**
- Built into Yjs specifically for this use case
- Automatically syncs cursor positions and user metadata
- Works seamlessly with y-websocket
- Zero additional sync code needed

**Implementation:**
- Use `provider.awareness` from y-websocket provider
- Set local user state: `awareness.setLocalState({ name, color, cursor })`
- Listen for awareness changes: `awareness.on('change', callback)`
- Assign random color to each user on connection
- Display user list with names and colors in UI
- Show cursor positions in textarea (if possible) or just active user list

---

# Technology Stack Summary

## PoC Stack

```
Frontend:
  ├─ React 18+ (TypeScript)
  ├─ Vite (build tool)
  ├─ Textarea (markdown editor)
  ├─ Yjs + y-websocket (real-time collaboration)
  ├─ react-markdown + remark-gfm (preview)
  └─ React Context + Hooks (state management)

Backend:
  ├─ Node.js + Express (TypeScript)
  ├─ y-websocket server (Yjs WebSocket provider)
  └─ In-memory Map for document storage

Infrastructure:
  └─ Local development only (can deploy to Railway/Render for remote testing)
```

---

# Implementation Approach

## PoC Development Phases

### Phase 1: Core Infrastructure
- Backend WebSocket server with Yjs integration
- Frontend React application scaffold
- Basic document routing

### Phase 2: Collaboration Features
- Real-time synchronization via Yjs
- User presence and awareness
- Basic markdown editing interface

### Phase 3: Preview & Polish
- Markdown preview rendering
- Connection state management
- Initial testing with multiple concurrent users

**Note:** Detailed implementation steps, build scripts, and development workflows are maintained in application README files and code comments.

---

# Evolution Path: PoC → MVP → Production

## PoC to MVP Upgrades

| Component | PoC | MVP | Rationale |
|-----------|-----|-----|----------|
| **Editor** | Basic Textarea | CodeMirror 6 | Better UX, syntax highlighting, Yjs integration |
| **Backend** | Express | NestJS | Structured architecture, DI, better testability |
| **Auth** | Name-based | Gmail SSO | Real authentication, user management |
| **Storage** | In-memory | GitHub + PostgreSQL | Persistence, version control, metadata |
| **Features** | Basic editing | + Document mgmt, comments, avatars | Core collaborative features |

## Architecture Evolution Considerations

- **Database:** PostgreSQL for user data, sessions, metadata; GitHub API for document content
- **Session Management:** Redis or PostgreSQL-based sessions
- **Deployment:** Target Railway or Render for hosting
- **Monitoring:** Add structured logging and basic observability

---

# Non-Functional Requirements (PoC)

## Security Posture

- **Authentication:** Name-based only (no sensitive data in PoC)
- **Transport:** HTTPS/WSS for encrypted communication
- **XSS Protection:** react-markdown provides safe rendering by default
- **Input Validation:** Document ID validation to prevent injection
- **Note:** Rate limiting and advanced security controls deferred to MVP

## Performance Targets

- **Concurrent Users:** 3-5 users per document
- **Sync Latency:** <1 second for change propagation
- **Document Size:** <100KB
- **Availability:** Best-effort (in-memory storage acceptable for PoC)

---

# Key Design Decisions

## Resolved for PoC

1. **Document Routing:** URL-based routing (`/doc/:id`) for better testing flexibility
2. **Editor Keybindings:** Default browser textarea behavior (no custom keybindings)
3. **Cursor Display:** Active users list only (cursor visualization deferred to MVP with CodeMirror)
4. **Deployment:** Local development first, optional deployment to Railway/Render for remote testing

---

# References

- [Yjs Documentation](https://docs.yjs.dev/)
- [Yjs Demos - Textarea Example](https://github.com/yjs/yjs-demos)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [y-websocket](https://github.com/yjs/y-websocket)

---

# Future Considerations

## Deferred to Later Phases

**MVP Phase:**
- Database selection and schema design (PostgreSQL recommended)
- GitHub integration architecture (Octokit + commit strategy)
- Comment storage and threading
- Session management approach
- Production deployment configuration

**Horizon 1 Phase:**
- Multi-SSO provider support (Microsoft, GitHub)
- Advanced features: diagrams (Mermaid), offline editing, granular permissions
- Version history UI and diff visualization
- Performance optimization and caching strategies
