Implement a "Netflix-style" visual update for the onboarding and profile screens, featuring background image/video support and a dark, high-end theme.

### User-facing changes
- **Immersive Onboarding**: The profile setup screens will now feature a full-screen background image or video, creating a premium "Netflix-like" experience.
- **Glassmorphism UI**: All forms and inputs will be presented in sleek, semi-transparent "glass" cards that maintain readability while showing the background.
- **Dark Theme Priority**: The UI will default to a dark, high-contrast aesthetic that matches the requested "Netflix" style.

### Technical details
- **Background Support**: Modify `Onboarding.tsx` to include a background container that supports both images (e.g., from `tenant.hero_url`) and potentially video backgrounds.
- **Branding Integration**: Utilize the `useBranding` hook to dynamically pull the tenant's primary colors and hero assets.
- **Styling Refactor**: Replace standard card styles with `backdrop-blur` and semi-transparent backgrounds (`bg-background/60` or `bg-black/40`).
- **Layout Optimization**: Center the onboarding content vertically and horizontally to create a focused, cinematic experience.

Technical details:
- Update `src/pages/Onboarding.tsx` to use `useBranding`.
- Add a background layer with `hero-default.jpg` as fallback.
- Apply `bg-black` to the main container and use `z-index` for layering.
- Add an option (via tenant config or hardcoded for now) to show a video background.
