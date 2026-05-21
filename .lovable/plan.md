I will set up the push notification infrastructure using Supabase Edge Functions and pg_cron to automate hydration, workout, and diet reminders.

### Phase 1: Edge Function
1. Create a new Edge Function `fcm-notifications` that:
    - Authenticates with Google FCM V1 API using a Service Account.
    - Sends notifications to a specific push token.
    - Handles error cases and logging.

### Phase 2: Database Infrastructure
1. Create a migration to:
    - Enable the `pg_net` extension to allow the database to call Edge Functions.
    - Create a helper function `public.send_push_notification` to encapsulate the HTTP call to the Edge Function.
    - Create a scheduling function `public.check_and_send_reminders` that:
        - Checks `refeicoes` for upcoming meals (diet reminders).
        - Checks `treinos_prescritos` for daily workouts (workout reminders).
        - Generates hydration reminders at set intervals (e.g., every 3 hours).
    - Configure `pg_cron` jobs to run the checker function every minute.

### Phase 3: Security & Configuration
1. Use Supabase Vault or Edge Function secrets to store:
    - `FIREBASE_SERVICE_ACCOUNT` (JSON containing project_id, client_email, private_key).
    - The Supabase Service Role key (needed for the DB to call the Edge Function).

**Note for the user:** To make this work, you will need to add the Firebase Service Account JSON as a secret in your Supabase project (Settings -> API -> Edge Function Secrets) with the name `FIREBASE_SERVICE_ACCOUNT`.

### Technical Details
- The Edge Function will use `deno-google-auth` or manual JWT signing for FCM V1.
- `pg_cron` will call the DB function, which uses `pg_net` for asynchronous, non-blocking requests.
- We will track sent notifications in a `notification_logs` table to prevent duplicates.
