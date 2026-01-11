# Technical Design: Multi-User Collaborative Markdown Editor

**Last Updated:** 2026-01-11
**Status:** PoC Phase - Decisions Finalized
**Related Documents:** [PRD](./prd-collaborative-markdown-editor.md)

---

## Document Overview

This document captures the finalized technical decisions for the multi-user collaborative markdown editor.

**Important Note:** These decisions are specific to the **PoC (Proof of Concept) phase**. Technical choices may evolve for MVP and Horizon 1 phases based on lessons learned and changing requirements.

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

# Implementation Plan

## PoC Implementation Steps

### Step 1: Backend Setup
- Initialize Node.js + Express + TypeScript project
- Install dependencies: `yjs`, `y-websocket`, `express`, `ws`
- Set up y-websocket server
- Create in-memory document store (`Map<string, Y.Doc>`)
- Test WebSocket connection with simple client

### Step 2: Frontend Setup
- Initialize React + TypeScript + Vite project
- Install dependencies: `yjs`, `y-websocket`, `react-markdown`, `remark-gfm`
- Create basic layout (split-pane: textarea left, preview right)
- Implement simple name input for user authentication

### Step 3: Yjs Integration
- Connect y-websocket provider to backend
- Bind Yjs `Y.Text` to textarea
- Implement bidirectional sync (textarea ↔ Yjs)
- Test real-time collaboration with multiple browser tabs

### Step 4: Presence & Preview
- Implement user presence with Yjs Awareness API
- Display active users list with colors
- Implement markdown preview with react-markdown
- Style UI for basic usability

### Step 5: Testing & Polish
- Test with 3-5 concurrent users
- Verify <1 second sync latency
- Add connection status indicator
- Fix any bugs
- Basic error handling

---

# Migration Path: PoC → MVP

When we move from PoC to MVP, we'll upgrade:

1. **Markdown Editor:** Textarea → CodeMirror 6
   - Better editing experience with syntax highlighting
   - Good Yjs integration with `y-codemirror`

2. **Backend:** Express → NestJS
   - Better structure with modules and dependency injection
   - Easier to scale and test

3. **Authentication:** Name-based → Gmail SSO
   - Add Passport.js with Google OAuth
   - Implement session management (Redis or PostgreSQL)

4. **Storage:** In-memory → GitHub + PostgreSQL
   - GitHub for document content (via Octokit)
   - PostgreSQL for metadata, comments, sessions
   - Implement periodic commit strategy (every 30-60s)

5. **Add Features:**
   - Document management UI (list, create, open)
   - Comment system (sidebar threads)
   - User avatars from Google profiles
   - Save status indicators

---

# Security Considerations (PoC)

Since this is PoC with no real authentication:

- ⚠️ **No sensitive data** - PoC is for testing only
- ✅ Use HTTPS even in development (for WebSocket wss://)
- ✅ Sanitize markdown output (react-markdown does this by default)
- ✅ Validate document IDs to prevent injection
- ⚠️ No rate limiting (add in MVP)

---

# Performance Targets (PoC)

- **Concurrent users:** 3-5 users per document
- **Sync latency:** <1 second for changes to propagate
- **Document size:** <100KB (no large documents in PoC)
- **Uptime:** Acceptable to restart server (in-memory storage)

---

# Open Questions

1. **Document routing:** Single hardcoded document or URL routing (`/doc/:id`)?
   - **Decision:** Use simple URL routing - minimal extra work, better for testing

2. **Editor keybindings:** Should we support any special keybindings?
   - **Decision:** Default browser textarea behavior for PoC (no special keybindings)

3. **Cursor display:** Show other users' cursors in textarea?
   - **Decision:** Just show active users list (cursor display hard in textarea, wait for MVP)

4. **Deployment:** Local only or deploy somewhere for remote testing?
   - **Decision:** Start local, optionally deploy to Railway/Render if team needs remote testing

---

# References

- [Yjs Documentation](https://docs.yjs.dev/)
- [Yjs Demos - Textarea Example](https://github.com/yjs/yjs-demos)
- [react-markdown](https://github.com/remarkjs/react-markdown)
- [y-websocket](https://github.com/yjs/y-websocket)

---

# Future Considerations (MVP/Horizon 1)

These decisions are deferred to later phases:

- **MVP Decisions:**
  - Database choice (PostgreSQL recommended)
  - GitHub integration strategy (Octokit + periodic commits)
  - Comment storage approach (Database vs GitHub)
  - Deployment platform (Railway/Render recommended)
  - Session storage (Redis vs PostgreSQL)

- **Horizon 1 Decisions:**
  - Multi-SSO support (Microsoft, GitHub, etc.)
  - Diagram rendering (Mermaid.js)
  - Offline editing support
  - Version history UI
  - Document permissions
