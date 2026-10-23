# Architecture rules
- Workout completion must validate the selected day and re-read series for the exact active session before updating it; cached counts are not proof of completion.
- Recover old open workout sessions explicitly in the student screen without deleting history or converting empty sessions into completed workouts.