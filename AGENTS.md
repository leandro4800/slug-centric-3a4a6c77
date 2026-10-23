# Architecture rules
- Workout completion must validate the selected day and re-read series for the exact active session before updating it; cached counts are not proof of completion.
- Recover old open workout sessions explicitly in the student screen without deleting history or converting empty sessions into completed workouts.
- Workout share-card full-mode images are contained below a reserved header area, with a local title scrim in shared preview/export artwork; physical separation prevents AI framing failures from overlapping the title.