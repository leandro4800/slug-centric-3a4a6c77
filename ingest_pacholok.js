
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Using constants directly to avoid env var issues in this specific script
const SUPABASE_URL = "https://rmetppilvfrxosvxzhgj.supabase.co"; 
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function ingest() {
  const content = fs.readFileSync("pacholok_conhecimento.md", "utf-8");
  const sections = content.split(/^## /m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const lines = section.split("\n");
    const title = lines[0].trim();
    
    let nivel = "";
    if (title.toLowerCase().includes("adaptação")) nivel = "2";
    else if (title.toLowerCase().includes("iniciante")) nivel = "2";
    else if (title.toLowerCase().includes("intermediário") || title.toLowerCase().includes("intermediario")) nivel = "5";
    else if (title.toLowerCase().includes("avançado") || title.toLowerCase().includes("avancado")) nivel = "10";
    else if (title.toLowerCase().includes("atleta")) nivel = "10";

    const freqMatch = title.match(/(\d+)X/i);
    const freq = freqMatch ? parseInt(freqMatch[1]) : null;
    
    const enfaseMatch = title.match(/FOCO EM (.*)/i);
    const enfase = enfaseMatch ? enfaseMatch[1].trim() : "Geral";

    const exercises = [];
    let currentExercise = null;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const nameMatch = line.match(/^\d+\.\s+\*\*(.*)\*\*/);
      if (nameMatch) {
        if (currentExercise) exercises.push(currentExercise);
        currentExercise = { nome: nameMatch[1], series: "", intervalo: "", detalhes: "" };
        continue;
      }
      
      if (currentExercise) {
        if (line.includes("Séries/Repetições:")) currentExercise.series = line.split(":")[1].trim();
        if (line.includes("Intervalo:")) currentExercise.intervalo = line.split(":")[1].trim();
        if (line.startsWith("- ")) currentExercise.detalhes += line.substring(2) + " ";
      }
    }
    if (currentExercise) exercises.push(currentExercise);

    if (exercises.length > 0) {
      console.log(`Ingerindo: ${title} | Nível: ${nivel} | Freq: ${freq} | Ênfase: ${enfase}`);
      const { error } = await supabase.from("biblioteca_metodologia_pacho").insert({
        nome_exercicio: title,
        descricao_metodologia: section.substring(0, 1000),
        nivel,
        frequencia_semanal: freq,
        enfase,
        estrutura_json: { exercicios: exercises }
      });
      if (error) console.error("Erro ao inserir:", error);
    }
  }
}

ingest();
