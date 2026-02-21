# Enterprise Auth System

A production-ready, security-focused authentication frontend built with React, TypeScript, and Vite.

## Features
- **Secure Authentication Flow**: Token-based auth with Axios interceptors and auto-logout.
- **Complete Pages**: Login, Register, Forgot Password, Reset Password.
- **Advanced UX**:
    - Animated transitions (Framer Motion).
    - Client-side validation (Zod + React Hook Form).
    - Password strength indicator.
    - Floating labels / Modern Input design.
    - Dark/Light mode support.
- **Code Quality**:
    - TypeScript strict mode.
    - Clean architecture (Context, Hooks, API layer).
    - Modular CSS (CSS Modules + Variables).

## Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Architecture
- `src/api`: Centralized API client.
- `src/context`: State management (Auth).
- `src/components`: Reusable UI components.
- `src/pages`: Feature pages.
- `src/styles`: Design tokens and global styles.

## Backend Integration
This frontend is designed to work with any JWT-based backend.
To connect:
1. Update `.env` (or create one) with `VITE_API_URL`.
2. Ensure endpoints match `api/client.ts` expectations or update the call sites in `AuthContext.tsx`.

## License
MIT
