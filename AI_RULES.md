# AI Coding Rules and Tech Stack Reference

## Tech Stack
* **Build Tool:** Vite (configured with `@vitejs/plugin-react-swc` for ultra-fast compilation).
* **Frontend Framework:** React 18 with TypeScript (Strict mode enabled).
* **Routing:** React Router DOM (v6), with all route definitions centralized in `src/App.tsx`.
* **State Management & Fetching:** TanStack React Query (v5) for caching, optimistic updates, and server synchronization.
* **Database & Backend:** Supabase (for authentication, PostgreSQL database, Edge Functions, and storage).
* **Styling:** Tailwind CSS with utility-first classes and CSS variables for real-time dynamic branding.
* **Component Library:** shadcn/ui (Radix UI primitives tailored with Tailwind CSS and styled with sharp corners for authority/luxury aesthetics).
* **Icons:** Lucide React (the standard icon set for all menus, action buttons, and indicators).
* **Testing:** Vitest with JSDOM and Testing Library.

---

## Library Selection Rules

### 1. UI Components (shadcn/ui & Radix)
* **Rule:** Always use shadcn/ui components (from `@/components/ui/...`) for primitive UI elements like Buttons, Dialogs, Selects, Accordions, Sliders, and Input fields.
* **Rule:** If a primitive doesn't exist, build it using Radix UI primitives directly or extend existing shadcn components.
* **Do Not:** Use raw HTML inputs or unstyled button elements unless writing high-performance low-level elements. Keep the luxury design system consistent.

### 2. Styling (Tailwind CSS)
* **Rule:** Always use Tailwind CSS utility classes. Avoid inline style attributes unless implementing dynamic runtime values (like HSL colors or sliding percentages).
* **Rule:** Use custom HSL tokens (`hsl(var(--primary))`, `hsl(var(--background))`, etc.) to support the multi-tenant real-time branding provider.
* **Rule:** Maintain the project's signature "sharp corners" design by keeping `rounded-none` or `var(--radius)` (which evaluates to `0rem` for authority-driven branding).

### 3. Data Fetching & Sync (React Query vs Supabase Client)
* **Rule:** Use the Supabase client (`@/integrations/supabase/client`) for raw database interactions and Edge Function invocations.
* **Rule:** Always wrap database and API fetches in TanStack Query `useQuery` or `useMutation` hooks to manage state, loading indicators, and caching.
* **Do Not:** Use local `useState` + `useEffect` combinations for global server data fetching unless it is purely local state (like input drafts).

### 4. Icons (Lucide React)
* **Rule:** Use `lucide-react` for all icons.
* **Rule:** Import specific icons directly (e.g., `import { Dumbbell } from "lucide-react"`).

### 5. Notifications & Toasts (Sonner vs Toaster)
* **Rule:** Use `sonner` via `toast("message")` or `toast.success()` / `toast.error()` for rapid, non-blocking toast notifications.
* **Rule:** Use `@/components/ui/use-toast` (Toaster) for more complex dialog-linked or persistent alerts.

### 6. Video Playing (YouTube vs HTML5 Video)
* **Rule:** Use the centralized `ExercisePlayer` component for managing video playback.
* **Rule:** Always support both direct video URLs (MP4/WebM) and YouTube embedding via automatic URL extraction.

---

## Architecture Guidelines

* **Pages vs Components:** Place top-level router pages in `src/pages/` (and site admin specific pages in `src/pages/site-admin/`). Place reusable components in `src/components/` (and admin dashboard specific helpers in `src/components/admin/`).
* **Routing:** Keep routes clean and defined exclusively inside `src/App.tsx`.
* **Multi-tenancy:** Always verify `tenant_id` and load the tenant metadata using the `useBranding()` context whenever user-facing pages are rendered.
* **Multi-tenant isolation:** All database queries within `/site/admin` must filter strictly on the coach's `tenant_id` to prevent cross-tenant data leaks.
</dyad-file>
<dyad-chat-summary>Create AI_RULES.md documenting the tech stack and guidelines</dyad-chat-summary>I've created the `AI_RULES.md` file documenting the application's tech stack and providing clear, actionable rules for selecting libraries and styling components.<dyad-write path="AI_RULES.md" description="Expanding AI_RULES.md with database, auth, and security guidelines"># AI Coding Rules and Tech Stack Reference

## Tech Stack
* **Build Tool:** Vite (configured with `@vitejs/plugin-react-swc` for ultra-fast compilation).
* **Frontend Framework:** React 18 with TypeScript (Strict mode enabled).
* **Routing:** React Router DOM (v6), with all route definitions centralized in `src/App.tsx`.
* **State Management & Fetching:** TanStack React Query (v5) for caching, optimistic updates, and server synchronization.
* **Database & Backend:** Supabase (for authentication, PostgreSQL database, Edge Functions, and storage).
* **Styling:** Tailwind CSS with utility-first classes and CSS variables for real-time dynamic branding.
* **Component Library:** shadcn/ui (Radix UI primitives tailored with Tailwind CSS and styled with sharp corners for authority/luxury aesthetics).
* **Icons:** Lucide React (the standard icon set for all menus, action buttons, and indicators).
* **Testing:** Vitest with JSDOM and Testing Library.

---

## Library Selection Rules

### 1. UI Components (shadcn/ui & Radix)
* **Rule:** Always use shadcn/ui components (from `@/components/ui/...`) for primitive UI elements like Buttons, Dialogs, Selects, Accordions, Sliders, and Input fields.
* **Rule:** If a primitive doesn't exist, build it using Radix UI primitives directly or extend existing shadcn components.
* **Do Not:** Use raw HTML inputs or unstyled button elements unless writing high-performance low-level elements. Keep the luxury design system consistent.

### 2. Styling (Tailwind CSS)
* **Rule:** Always use Tailwind CSS utility classes. Avoid inline style attributes unless implementing dynamic runtime values (like HSL colors or sliding percentages).
* **Rule:** Use custom HSL tokens (`hsl(var(--primary))`, `hsl(var(--background))`, etc.) to support the multi-tenant real-time branding provider.
* **Rule:** Maintain the project's signature "sharp corners" design by keeping `rounded-none` or `var(--radius)` (which evaluates to `0rem` for authority-driven branding).

### 3. Data Fetching & Sync (React Query vs Supabase Client)
* **Rule:** Use the Supabase client (`@/integrations/supabase/client`) for raw database interactions and Edge Function invocations.
* **Rule:** Always wrap database and API fetches in TanStack Query `useQuery` or `useMutation` hooks to manage state, loading indicators, and caching.
* **Do Not:** Use local `useState` + `useEffect` combinations for global server data fetching unless it is purely local state (like input drafts).

### 4. Icons (Lucide React)
* **Rule:** Use `lucide-react` for all icons.
* **Rule:** Import specific icons directly (e.g., `import { Dumbbell } from "lucide-react"`).

### 5. Notifications & Toasts (Sonner vs Toaster)
* **Rule:** Use `sonner` via `toast("message")` or `toast.success()` / `toast.error()` for rapid, non-blocking toast notifications.
* **Rule:** Use `@/components/ui/use-toast` (Toaster) for more complex dialog-linked or persistent alerts.

### 6. Video Playing (YouTube vs HTML5 Video)
* **Rule:** Use the centralized `ExercisePlayer` component for managing video playback.
* **Rule:** Always support both direct video URLs (MP4/WebM) and YouTube embedding via automatic URL extraction.

---

## Architecture Guidelines

* **Pages vs Components:** Place top-level router pages in `src/pages/` (and site admin specific pages in `src/pages/site-admin/`). Place reusable components in `src/components/` (and admin dashboard specific helpers in `src/components/admin/`).
* **Routing:** Keep routes clean and defined exclusively inside `src/App.tsx`.
* **Multi-tenancy:** Always verify `tenant_id` and load the tenant metadata using the `useBranding()` context whenever user-facing pages are rendered.
* **Multi-tenant isolation:** All database queries within `/site/admin` must filter strictly on the coach's `tenant_id` to prevent cross-tenant data leaks.

---

## Database, Auth, and Security Rules

### 1. Row-Level Security (RLS) & Client Queries
* **Rule:** Never disable or bypass Row-Level Security on database tables for client-side queries.
* **Rule:** Client-side operations must execute under the authenticated user's JWT. 
* **Rule:** If an operation requires elevated privileges (such as creating an user without sending an invite or modifying system-wide metadata), delegate this action to a Supabase Edge Function that uses the `SERVICE_ROLE` key securely on the backend.

### 2. Edge Functions
* **Rule:** Create server-side logic (e.g., payment integrations, heavy AI processing, and batch imports) as Supabase Edge Functions.
* **Rule:** Edge Functions must validate the user's auth token before executing restricted operations, or rely on internal service-role validation.
* **Rule:** Ensure CORS headers are handled correctly for all preflight OPTIONS requests.