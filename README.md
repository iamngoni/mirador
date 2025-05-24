# Mirador

Mirador is a web-based dashboard designed to make debugging and profiling Dart VM applications easier, faster, and more approachable. It connects to a running Dart VM’s observatory service and presents live insights into your app’s performance, memory, isolates, logs, and extension events, all within a streamlined browser UI.

## Purpose

- **Unified Dart VM Insights:** Bring together observability (logs, timeline, memory, isolates) and debugging tools that are otherwise scattered or difficult to access.
- **Live Connection Management:** Quickly connect, reconnect, and monitor connection status with your Dart VM, including advanced handling of reconnections.
- **Modern Navigation:** Move between key debugging panels—from dashboard and logs to memory and extensions—through a persistent sidebar for fast context switching.

## Key Features

- **One-click connect** to Dart VM and clear status feedback (including automatic reconnection).
- **Structured sidebar navigation** for easy access to Dashboard, Logs, Timeline, Memory, Isolates, and Extensions.
- **Live data panels** leveraging TanStack Router for fast, code-split navigation.
- **Extensible foundation** for adding custom panels or observability endpoints.

## How It Works

- **Routing:** Uses TanStack Router v1 for modern, type-safe, and code-split routing. Each panel (e.g., `/logs`, `/timeline`) is a direct child route rendered within the global Layout.
- **Layout:** A unified header (with connection management) and sidebar remain visible across all pages; only the main content changes as you navigate.
- **Dynamic Imports:** Page components are dynamically loaded for fast initial load and optimal performance.
- **Connection State:** A global connection/reconnection flow is handled at the layout level, so reconnecting is seamless throughout the app.

## Getting Started

1. Install dependencies and run the development server (`pnpm install` / `pnpm run dev`).
2. Connect to a running Dart VM by clicking the "Connect" button and entering your VM's WebSocket URL.
3. Navigate between panels using the sidebar.

## Developer Notes

- Add new panels by creating a file in `src/pages/`, exporting a default React component, and registering it in `src/routeTree.tsx`.
- The layout and connection modal logic live in `src/components/layout.tsx`.
- All navigation uses `<Link>` from TanStack Router for SPA-style transitions and accessible focus management.

---

Mirador’s goal is to provide every Flutter developer with a simple debugging dashboard—simple to use, powerful in depth, and built for extensibility.
