Implemented a new workout generation logic for Dr. IA, integrating the Pacholok methodology library and clinical health assessments.

### Technical Implementation

#### 1. Database & Edge Function Integration
- **Model Lookup & Randomization**: Updated `gerar-treino-ia` to fetch workout templates from `biblioteca_metodologia_pacho` based on the student's level (Beginner, Intermediate, Advanced, Athlete).
- **Variant Selection**: Added logic to randomly select one of three available variants (1, 2, or 3) for each level.
- **Structured Data Retrieval**: The AI now strictly follows `ordem_exercicio` and includes specialized columns: `series_aquecimento`, `series_ajuste`, `series_trabalho`, `tecnica_especifica`, and `cadencia`.
- **Clinical Health Opinion**: Added a "Health Assessment" module. If the student has recent blood tests in `analises_clinicas`, the AI cross-references them with health standards to append a 'Clinical Observation' at the end of the prescription.

#### 2. Student Dashboard Enhancements
- **Visual Intensity Highlighting**: Modified `ExerciseCard.tsx` to detect series types. "Ajuste" (Feeder) and "Trabalho" (Work) series are now visually highlighted with specific colors and bold styling to guide the student toward high-intensity sets.
- **Metadata Support**: Updated the UI to display the specific Pacho set structure (Warm-up + Feeder + Work) instead of just generic counts.

#### 3. Frontend logic
- Updated `Treino.tsx` to handle the new structured response from the Edge Function, ensuring seamless rendering of the complex Pacholok set patterns.

### Clinical References Integration
The system uses clinical thresholds (Vitamin D, Testosterone, CRP, Glucose, and Cortisol) to provide context-aware safety and performance advice based on the student's latest exam data.
