I will fix the onboarding flow for new users by making it tenant-aware and ensuring it correctly captures the context of the gym they are trying to join (like `alphateam`).

### Technical details:
- **Routing**: Update `App.tsx` to support `/:slug/onboarding`, allowing the onboarding page to load the correct branding (logo, colors, background).
- **Branding**: Modify `BrandingProvider.tsx` to stop treating "onboarding" as a reserved keyword, enabling slug detection for onboarding routes.
- **Redirects**: 
    - Update `IndexRedirect.tsx` to send new users to `/:slug/onboarding` if a slug is present in the URL or Branding context.
    - Update `RequireAuth.tsx` to redirect non-members specifically to their intended tenant's onboarding page instead of a generic one.
- **Onboarding Page**: 
    - Update `Onboarding.tsx` to retrieve the `slug` from the URL.
    - Ensure it uses the tenant ID from the Branding context if the user's profile doesn't have one yet.
    - Fix the final navigation to correctly send users to their tenant's dashboard after completion.

These changes will prevent the "lost context" and potential redirect loops that were causing errors for new users.
