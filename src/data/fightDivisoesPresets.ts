// Divisões de treino de MUSCULAÇÃO para o segmento de LUTA (tenants vertical = 'fight').
// Separadas por MODALIDADE (bjj / muay_thai / boxe / mma) e por NÍVEL de treino.
// Cada dia já vem com os exercícios prescritos (séries/reps) e o vídeo de referência
// quando existe um link conhecido — o resto é resolvido pela biblioteca do CT.

export type FightNivel = "Iniciante" | "Intermediário" | "Avançado";

export type FightExPreset = {
  nome: string;
  series: string;
  repeticoes: string;
  obs?: string;
};

export type FightDiaPreset = {
  label: string;
  exercicios: FightExPreset[];
};

export type FightDivisaoPreset = {
  id: string;
  modalidade: "bjj" | "muay_thai" | "boxe" | "mma";
  nivel: FightNivel;
  freq: number;
  label: string;
  dias: FightDiaPreset[];
};

/** Vídeos de referência (YouTube) por exercício — chave normalizada. */
const V: Record<string, string> = {
  "levantamento terra": "https://www.youtube.com/watch?v=op9kVnSso6Q",
  "levantamento terra heavy": "https://www.youtube.com/watch?v=op9kVnSso6Q",
  "levantamento terra sumo": "https://www.youtube.com/watch?v=nl2ZmSkjhOU",
  "elevacao de quadril com barra hip thrust": "https://www.youtube.com/watch?v=xDmFkJxPzeM",
  "hip thrust pesado com barra": "https://www.youtube.com/watch?v=xDmFkJxPzeM",
  "barra fixa com pegada neutra": "https://www.youtube.com/watch?v=eGo4IYlbE5g",
  "barra fixa neutra": "https://www.youtube.com/watch?v=eGo4IYlbE5g",
  "barra fixa neutra com carga": "https://www.youtube.com/watch?v=eGo4IYlbE5g",
  "prancha abdominal": "https://www.youtube.com/watch?v=ASdvN_XEl_c",
  "agachamento goblet": "https://www.youtube.com/watch?v=MeIiIdhvXT4",
  "remada curvada com halteres": "https://www.youtube.com/watch?v=roCP6wCXPqo",
  "farmers walk com halteres": "https://www.youtube.com/watch?v=Fkzk_RqlYig",
  "farmers walk": "https://www.youtube.com/watch?v=Fkzk_RqlYig",
  "abdominal canivete": "https://www.youtube.com/watch?v=6uT8p2wm0Ic",
  "agachamento frontal com barra": "https://www.youtube.com/watch?v=uYumuL_G_V0",
  "agachamento frontal": "https://www.youtube.com/watch?v=uYumuL_G_V0",
  "agachamento livre com barra": "https://www.youtube.com/watch?v=ultWZbUMPL8",
  "agachamento livre": "https://www.youtube.com/watch?v=ultWZbUMPL8",
  "stiff com barra": "https://www.youtube.com/watch?v=CN_7cz3P-1U",
  "stiff com halteres": "https://www.youtube.com/watch?v=CN_7cz3P-1U",
  "pallof press no cabo": "https://www.youtube.com/watch?v=AH_QZLm_0-s",
  "desenvolvimento militar com barra": "https://www.youtube.com/watch?v=2yjwXTZQDDI",
  "desenvolvimento militar": "https://www.youtube.com/watch?v=2yjwXTZQDDI",
  "desenvolvimento com halteres": "https://www.youtube.com/watch?v=qEwKCR5JCog",
  "face pull no cabo": "https://www.youtube.com/watch?v=rep-qVOkqgk",
  "remada baixa no cabo": "https://www.youtube.com/watch?v=GZbfZ033f74",
  "agachamento bulgaro com halteres": "https://www.youtube.com/watch?v=2C-uNgKwPLE",
  "passada com halteres": "https://www.youtube.com/watch?v=D7KaRcUTQeE",
  "good morning": "https://www.youtube.com/watch?v=vKPGe8zb2S0",
  "power clean com barra": "https://www.youtube.com/watch?v=Kt2iMLiZLBk",
  "power clean": "https://www.youtube.com/watch?v=Kt2iMLiZLBk",
  "push press com barra": "https://www.youtube.com/watch?v=iaBVSJm78ko",
  "push press": "https://www.youtube.com/watch?v=iaBVSJm78ko",
  "supino reto com barra": "https://www.youtube.com/watch?v=rT7DgCr-3pg",
  "supino reto com halteres": "https://www.youtube.com/watch?v=VmB1G1K7v94",
  "supino inclinado com halteres": "https://www.youtube.com/watch?v=8iPEnn-ltC8",
  "flexao de braco explosiva": "https://www.youtube.com/watch?v=Kd_DUsMJIsc",
  "flexao pliometrica": "https://www.youtube.com/watch?v=Kd_DUsMJIsc",
  "landmine rotation": "https://www.youtube.com/watch?v=D6JeoIYyzhY",
  "landmine punch": "https://www.youtube.com/watch?v=D6JeoIYyzhY",
  "landmine press unilateral": "https://www.youtube.com/watch?v=lM_wOL2C1DA",
  "cable woodchopper": "https://www.youtube.com/watch?v=pAplQXk3dkU",
  "rotacao de tronco no cabo": "https://www.youtube.com/watch?v=pAplQXk3dkU",
  "agachamento salto com halteres": "https://www.youtube.com/watch?v=CVaEhXotL7M",
  "jump squat": "https://www.youtube.com/watch?v=CVaEhXotL7M",
  "agachamento zercher": "https://www.youtube.com/watch?v=dTfMTBEmgUY",
  "zercher carry": "https://www.youtube.com/watch?v=dTfMTBEmgUY",
  "abdominal roda": "https://www.youtube.com/watch?v=g0h0ie6JmRA",
  "abdominal infra na barra fixa": "https://www.youtube.com/watch?v=Pr1sVfsMt9k",
  "encolhimento de ombros com halteres": "https://www.youtube.com/watch?v=cJRVVxmytaM",
  "remada pendlay com barra": "https://www.youtube.com/watch?v=Kn0BS-Mtqxs",
  "remada curvada com barra": "https://www.youtube.com/watch?v=vT2GjY_Umpw",
  "paralelas dips": "https://www.youtube.com/watch?v=2z8JmcrW-As",
  "leg press 45": "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
  "leg press": "https://www.youtube.com/watch?v=IZxyjW7MPJQ",
  "manguito rotador no cabo": "https://www.youtube.com/watch?v=8pB4Yfzhz0k",
  "treino cervical com anilha": "https://www.youtube.com/watch?v=fHfDHfDoQwc",
  "puxada alta no crossover": "https://www.youtube.com/watch?v=CAwf7n6Luuc",
  "sprints na esteira": "https://www.youtube.com/watch?v=Q2P8mQ0Nlxg",
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Vídeo conhecido para o exercício (match exato ou por prefixo). */
export const fightVideoFor = (nome: string): string | null => {
  const n = norm(nome);
  if (V[n]) return V[n];
  const key = Object.keys(V).find((k) => n.startsWith(k) || n.includes(k));
  return key ? V[key] : null;
};

const ex = (nome: string, series = "3", repeticoes = "10", obs?: string): FightExPreset => ({
  nome,
  series,
  repeticoes,
  obs,
});

export const FIGHT_DIVISOES_PRESETS: FightDivisaoPreset[] = [
  // ==================== BJJ ====================
  {
    id: "bjj-ini-2x", modalidade: "bjj", nivel: "Iniciante", freq: 2,
    label: "BJJ 2x — Full Body Fundamental",
    dias: [
      { label: "A — Força de Base & Postura", exercicios: [
        ex("Levantamento Terra (Barra)", "4", "6", "Fortalece lombar e glúteos"),
        ex("Barra Fixa com Pegada Neutra", "3", "8", "Simula a puxada de gola"),
        ex("Elevação de Quadril com Barra (Hip Thrust)", "3", "10", "Potência de raspagem"),
        ex("Prancha Abdominal", "3", "45s"),
      ]},
      { label: "B — Estabilidade & Pegada", exercicios: [
        ex("Agachamento Goblet (Halter)", "4", "8", "Força e mobilidade de quadril"),
        ex("Remada Curvada com Halteres (Pegada Pronada)", "3", "10"),
        ex("Farmer's Walk com Halteres Pesados", "4", "40m", "Isometria extrema de pegada"),
        ex("Abdominal Canivete no Banco", "3", "12"),
      ]},
    ],
  },
  {
    id: "bjj-ini-3x", modalidade: "bjj", nivel: "Iniciante", freq: 3,
    label: "BJJ 3x — Full Body A/B/C",
    dias: [
      { label: "A — Terra & Puxada", exercicios: [
        ex("Levantamento Terra", "4", "6"), ex("Remada Curvada com Barra", "3", "10"),
        ex("Supino Reto com Halteres", "3", "10"), ex("Abdominal Infra no Banco", "3", "12"),
      ]},
      { label: "B — Quadril & Grip", exercicios: [
        ex("Agachamento Frontal com Barra", "4", "8"), ex("Barra Fixa Neutra", "3", "8"),
        ex("Elevação de Quadril com Barra (Hip Thrust)", "3", "10"), ex("Farmer's Walk com Halteres", "3", "40m"),
      ]},
      { label: "C — Unilateral & Core", exercicios: [
        ex("Passada com Halteres", "3", "10"), ex("Remada Serrote Unilateral", "3", "10"),
        ex("Stiff com Halteres", "3", "10"), ex("Pallof Press no Cabo", "3", "12"),
      ]},
    ],
  },
  {
    id: "bjj-ini-4x", modalidade: "bjj", nivel: "Iniciante", freq: 4,
    label: "BJJ 4x — Upper / Lower",
    dias: [
      { label: "A — Superiores (Puxar/Empurrar)", exercicios: [
        ex("Barra Fixa Neutra", "4", "8"), ex("Desenvolvimento com Halteres", "3", "10"),
        ex("Remada Baixa no Cabo (Pegada Triângulo)", "3", "12"), ex("Face Pull no Cabo", "3", "15"),
      ]},
      { label: "B — Inferiores & Core", exercicios: [
        ex("Levantamento Terra", "4", "6"), ex("Elevação de Quadril com Barra (Hip Thrust)", "4", "10"),
        ex("Agachamento Búlgaro com Halteres", "3", "10"), ex("Abdominal Roda", "3", "12"),
      ]},
      { label: "C — Superiores (Força Isométrica)", exercicios: [
        ex("Remada Curvada com Barra", "4", "8"), ex("Flexão de Braço com Anilha nas Costas", "3", "10"),
        ex("Rosca Inversa com Barra", "3", "12"), ex("Isometria de Ombro com Halter", "3", "40s"),
      ]},
      { label: "D — Inferiores & Cadeia Posterior", exercicios: [
        ex("Agachamento Frontal", "4", "8"), ex("Good Morning (Barra)", "3", "10"),
        ex("Agachamento Sumô", "3", "10"), ex("Prancha Lateral", "3", "45s"),
      ]},
    ],
  },
  {
    id: "bjj-int-3x", modalidade: "bjj", nivel: "Intermediário", freq: 3,
    label: "BJJ 3x — Puxar / Empurrar / Posterior",
    dias: [
      { label: "A — Pegada & Puxadas", exercicios: [
        ex("Barra Fixa Neutra com Carga", "4", "6"), ex("Remada Pendlay com Barra", "3", "8"),
        ex("Pinch Grip com Anilha (caminhada)", "3", "40s"),
      ]},
      { label: "B — Quadril & Empurrar", exercicios: [
        ex("Hip Thrust Pesado com Barra", "4", "6"), ex("Agachamento Zercher", "3", "8"),
        ex("Supino Inclinado com Halteres", "3", "8"),
      ]},
      { label: "C — Cadeia Posterior & Core", exercicios: [
        ex("Stiff com Barra", "3", "8"), ex("Encolhimento de Ombros com Halteres Pesados", "4", "10"),
        ex("Abdominal Infra na Barra Fixa", "3", "12"),
      ]},
    ],
  },
  {
    id: "bjj-int-4x", modalidade: "bjj", nivel: "Intermediário", freq: 4,
    label: "BJJ 4x — A/B/C/D",
    dias: [
      { label: "A — Força de Quadril", exercicios: [
        ex("Agachamento Zercher", "4", "6"), ex("Elevação de Quadril com Barra (Hip Thrust)", "4", "8"),
        ex("Stiff com Barra", "3", "8"), ex("Abdominal Roda", "3", "12"),
      ]},
      { label: "B — Membros Superiores", exercicios: [
        ex("Barra Fixa Neutra com Carga", "4", "6"), ex("Supino Reto com Halteres", "3", "8"),
        ex("Remada Kroc Row (Serrote Pesado)", "3", "10"), ex("Rotação Externa de Ombro no Cabo", "3", "15"),
      ]},
      { label: "C — Potência de Ponte e Raspagem", exercicios: [
        ex("Leg Press 45° Unilateral em Velocidade", "4", "8"), ex("Agachamento Sumô com Halter", "3", "10"),
        ex("Desenvolvimento Militar em Pé", "3", "8"),
      ]},
      { label: "D — Grip & Prevenção", exercicios: [
        ex("Farmer's Walk com Halteres Pesados", "4", "40m"), ex("Barra Fixa Isométrica", "4", "30s"),
        ex("Manguito Rotador no Cabo", "3", "15"),
      ]},
    ],
  },
  {
    id: "bjj-int-5x", modalidade: "bjj", nivel: "Intermediário", freq: 5,
    label: "BJJ 5x — Push / Pull / Legs / Potência / Core",
    dias: [
      { label: "A — Push", exercicios: [
        ex("Supino Inclinado com Halteres", "4", "8"), ex("Desenvolvimento Militar com Barra", "4", "6"),
        ex("Paralelas (Dips)", "3", "10"),
      ]},
      { label: "B — Pull / Grip", exercicios: [
        ex("Barra Fixa Neutra com Carga", "4", "6"), ex("Remada Unilateral no Cabo", "3", "12"),
        ex("Rosca Zottman com Halteres", "3", "12"),
      ]},
      { label: "C — Legs / Quadril", exercicios: [
        ex("Levantamento Terra Sumô", "4", "5"), ex("Passada Búlgaro", "3", "10"), ex("Cadeira Flexora", "3", "12"),
      ]},
      { label: "D — Potência", exercicios: [
        ex("Leg Press Rápido (Carga Média)", "4", "8"), ex("Supino Reto Explosivo (50% RM)", "4", "5"),
        ex("Puxada Alta no Crossover", "3", "10"),
      ]},
      { label: "E — Core & Prevenção", exercicios: [
        ex("Pallof Press no Cabo", "3", "12"), ex("Cable Woodchopper", "3", "10"), ex("Prancha Dinâmica", "3", "45s"),
      ]},
    ],
  },
  {
    id: "bjj-av-4x", modalidade: "bjj", nivel: "Avançado", freq: 4,
    label: "BJJ 4x — Atleta em Camp",
    dias: [
      { label: "A — Potência Neural", exercicios: [
        ex("Power Clean com Barra", "4", "3"), ex("Jump Squat com Halteres", "4", "5"),
        ex("Supino Reto Explosivo", "4", "5"),
      ]},
      { label: "B — Isometria Especial", exercicios: [
        ex("Agachamento Zercher Isométrico", "3", "30s"), ex("Barra Fixa Isométrica", "3", "40s"),
        ex("Farmer's Walk Extremo", "4", "20m"),
      ]},
      { label: "C — Resistência Láctica", exercicios: [
        ex("Leg Press", "4", "15", "Circuito — 4 rounds, 1 min descanso"),
        ex("Remada Baixa no Cabo", "4", "15", "Circuito"),
        ex("Flexão de Braço", "4", "15", "Circuito"),
        ex("Passada com Halteres", "4", "20 passos", "Circuito"),
      ]},
      { label: "D — Prevenção & Mobilidade", exercicios: [
        ex("Rotação de Ombro no Cabo", "3", "15"), ex("Abdominal Infra", "3", "15"),
        ex("Treino Cervical com Anilha", "3", "15"),
      ]},
    ],
  },
  {
    id: "bjj-av-5x", modalidade: "bjj", nivel: "Avançado", freq: 5,
    label: "BJJ 5x — Faseamento de Camp",
    dias: [
      { label: "A — Força Máxima", exercicios: [ex("Levantamento Terra Heavy", "5", "2"), ex("Barra Fixa com Carga", "4", "4")] },
      { label: "B — Explosão", exercicios: [ex("Hip Thrust em Velocidade", "4", "6"), ex("Agachamento Salto com Halter", "4", "6")] },
      { label: "C — Isometria & Grip", exercicios: [ex("Puxada Alta Isométrica no Crossover", "4", "30s"), ex("Isometria com Anilha", "4", "40s")] },
      { label: "D — Resistência", exercicios: [ex("Sprints na Esteira em Inclinação", "10", "30s"), ex("Abdominal Roda", "3", "12")] },
      { label: "E — Recuperação", exercicios: [ex("Mobilidade no Pulley", "3", "12"), ex("Treino Cervical com Anilha", "3", "15")] },
    ],
  },
  {
    id: "bjj-av-6x", modalidade: "bjj", nivel: "Avançado", freq: 6,
    label: "BJJ 6x — Atleta Profissional",
    dias: [
      { label: "Seg — Potência", exercicios: [ex("Power Clean", "5", "3"), ex("Supino Reto Explosivo", "4", "5")] },
      { label: "Ter — Isometria", exercicios: [ex("Agachamento Zercher", "4", "6"), ex("Pinch Grip com Anilhas", "4", "40s")] },
      { label: "Qua — Cardio Zona 2", exercicios: [ex("Esteira / Transport Zona 2", "1", "40min")] },
      { label: "Qui — Resistência Láctica", exercicios: [ex("Circuito no Crossover", "4", "3min"), ex("Leg Press", "4", "20")] },
      { label: "Sex — Força Máxima", exercicios: [ex("Levantamento Terra", "5", "2"), ex("Barra Fixa com Carga", "4", "4")] },
      { label: "Sáb — Prevenção", exercicios: [ex("Manguito Rotador no Cabo", "3", "15"), ex("Treino Cervical com Anilha", "3", "15"), ex("Abdominal Roda", "3", "12")] },
    ],
  },

  // ==================== MUAY THAI ====================
  {
    id: "mt-ini-2x", modalidade: "muay_thai", nivel: "Iniciante", freq: 2,
    label: "Muay Thai 2x — Full Body Base",
    dias: [
      { label: "A — Base & Potência Rotacional", exercicios: [
        ex("Agachamento Livre com Barra", "4", "8"), ex("Desenvolvimento Militar com Barra", "3", "8", "Guarda alta"),
        ex("Rotação de Tronco no Cabo (Cable Woodchopper)", "4", "8"), ex("Prancha Abdominal", "3", "60s"),
      ]},
      { label: "B — Explosão & Core", exercicios: [
        ex("Passada/Avanço com Halteres", "3", "10"), ex("Flexão de Braço Explosiva (Pliométrica)", "3", "6"),
        ex("Landmine Rotation", "3", "10"), ex("Elevação Lateral Isométrica com Halter Leve", "3", "45s", "Guarda"),
      ]},
    ],
  },
  {
    id: "mt-ini-3x", modalidade: "muay_thai", nivel: "Iniciante", freq: 3,
    label: "Muay Thai 3x — Full Body A/B/C",
    dias: [
      { label: "A — Base & Rotação", exercicios: [ex("Agachamento Livre", "4", "8"), ex("Flexão Explosiva", "3", "8"), ex("Landmine Rotation", "3", "10"), ex("Tríceps Pulley", "3", "12")] },
      { label: "B — Deslocamento & Ombro", exercicios: [ex("Passada com Halteres", "3", "10"), ex("Desenvolvimento Militar", "3", "8"), ex("Abdominal Infra", "3", "15"), ex("Leg Press Explosivo", "3", "10")] },
      { label: "C — Posterior & Torque", exercicios: [ex("Stiff com Halteres", "3", "10"), ex("Supino Reto com Halteres", "3", "10"), ex("Pullover com Halter no Banco", "3", "12"), ex("Cable Woodchopper", "3", "10")] },
    ],
  },
  {
    id: "mt-ini-4x", modalidade: "muay_thai", nivel: "Iniciante", freq: 4,
    label: "Muay Thai 4x — Push/Pull Acelerado",
    dias: [
      { label: "A — Empurrar / Potência", exercicios: [ex("Flexão Pliométrica", "4", "6"), ex("Desenvolvimento Militar", "4", "8"), ex("Landmine Press Unilateral", "3", "10")] },
      { label: "B — Puxar / Estabilidade", exercicios: [ex("Remada Baixa no Cabo", "4", "12"), ex("Face Pull no Cabo", "3", "15"), ex("Barra Fixa Pegada Aberta", "3", "8"), ex("Farmer's Walk", "3", "40m")] },
      { label: "C — Inferiores & Rotacional", exercicios: [ex("Agachamento Salto com Halter Leve", "4", "6"), ex("Passada Lateral", "3", "10"), ex("Landmine Rotation", "3", "10"), ex("Abdominal Canivete", "3", "15")] },
      { label: "D — Resistência de Guarda", exercicios: [ex("Elevação Frontal/Lateral Isométrica com Halter", "4", "45s"), ex("Flexão Fechada", "3", "12"), ex("Abdominal Roda", "3", "12")] },
    ],
  },
  {
    id: "mt-int-3x", modalidade: "muay_thai", nivel: "Intermediário", freq: 3,
    label: "Muay Thai 3x — Potência / Explosão / Resistência",
    dias: [
      { label: "A — Potência Rotacional", exercicios: [ex("Landmine Rotation com Carga", "4", "6"), ex("Supino Reto com Barra em Velocidade (50%)", "4", "5"), ex("Cable Woodchopper", "3", "8")] },
      { label: "B — Explosão de Pernas", exercicios: [ex("Agachamento Salto com Halteres", "4", "6"), ex("Passada Explosiva Alternada", "3", "8"), ex("Agachamento Sumô no Crossover", "3", "10")] },
      { label: "C — Resistência de Ombros e Core", exercicios: [ex("Desenvolvimento de Ombros com Halteres Alternado", "3", "12"), ex("Isometria de Ombro no Cabo", "3", "45s"), ex("Abdominal Roda", "3", "12")] },
    ],
  },
  {
    id: "mt-int-4x", modalidade: "muay_thai", nivel: "Intermediário", freq: 4,
    label: "Muay Thai 4x — Força / Potência / Circuito / Core",
    dias: [
      { label: "A — Força de Base", exercicios: [ex("Agachamento com Barra", "4", "6"), ex("Supino Reto com Barra", "4", "6"), ex("Remada Pendlay", "3", "8"), ex("Abdominal Infra na Barra", "3", "12")] },
      { label: "B — Potência Explosiva", exercicios: [ex("Landmine Press Unilateral Explosivo", "4", "6"), ex("Flexão Pliométrica", "4", "6"), ex("Jump Squats no Leg Press", "4", "8")] },
      { label: "C — Resistência Específica", exercicios: [ex("Soco Direto no Cabo (carga leve)", "4", "30s", "Circuito na crossover"), ex("Agachamento Livre", "4", "30s", "Circuito"), ex("Abdominal", "4", "30s", "Circuito")] },
      { label: "D — Core Rotacional & Ombro", exercicios: [ex("Landmine Rotation", "4", "8"), ex("Face Pull com Carga", "3", "15"), ex("Elevação Lateral Isométrica no Cabo", "3", "45s")] },
    ],
  },
  {
    id: "mt-int-5x", modalidade: "muay_thai", nivel: "Intermediário", freq: 5,
    label: "Muay Thai 5x — Por Valência",
    dias: [
      { label: "A — Potência de Base", exercicios: [ex("Jump Squats", "4", "6"), ex("Passada Explosiva", "3", "8"), ex("Cadeira Flexora", "3", "12")] },
      { label: "B — Potência de Soco", exercicios: [ex("Landmine Press Unilateral", "4", "6"), ex("Supino Reto Explosivo", "4", "5"), ex("Rotação no Cabo", "3", "10")] },
      { label: "C — Resistência de Guarda", exercicios: [ex("Desenvolvimento Militar", "4", "10"), ex("Isometria de Ombro com Halter", "3", "45s"), ex("Flexão com Anilha nas Costas", "3", "10")] },
      { label: "D — Cardio na Esteira", exercicios: [ex("Sprints na Esteira", "15", "30s", "30s de descanso entre tiros")] },
      { label: "E — Mobilidade", exercicios: [ex("Puxada Alta Leve", "3", "15"), ex("Rotação de Quadril no Crossover", "3", "12"), ex("Manguito Rotador no Cabo", "3", "15")] },
    ],
  },
  {
    id: "mt-av-4x", modalidade: "muay_thai", nivel: "Avançado", freq: 4,
    label: "Muay Thai 4x — Atleta em Camp",
    dias: [
      { label: "A — Transferência Solo-Mão", exercicios: [ex("Landmine Punch", "4", "5"), ex("Puxada Unilateral no Cabo em Velocidade", "4", "6"), ex("Jump Squat com Barra", "4", "4")] },
      { label: "B — Resistência de Rounds", exercicios: [ex("Leg Press", "5", "30s", "Circuito 3-5 rounds de 3min"), ex("Supino Reto", "5", "30s", "Circuito"), ex("Remo no Crossover", "5", "30s", "Circuito"), ex("Abdominal", "5", "30s", "Circuito")] },
      { label: "C — Potência de Tronco", exercicios: [ex("Push Press com Barra", "4", "4"), ex("Landmine Rotation Pesado", "4", "6")] },
      { label: "D — Prevenção", exercicios: [ex("Treino Cervical com Anilha", "4", "15"), ex("Mobilidade de Quadril", "3", "10"), ex("Manguito Rotador no Cabo", "3", "15")] },
    ],
  },
  {
    id: "mt-av-5x", modalidade: "muay_thai", nivel: "Avançado", freq: 5,
    label: "Muay Thai 5x — Camp Profissional",
    dias: [
      { label: "A — Explosão", exercicios: [ex("Push Press", "4", "4"), ex("Landmine Punch", "4", "5"), ex("Jump Squats", "4", "6")] },
      { label: "B — Glicolítico", exercicios: [ex("Sprints na Esteira em Inclinação", "12", "30s")] },
      { label: "C — Cadeia Rotacional", exercicios: [ex("Cable Woodchopper", "4", "8"), ex("Landmine Rotation", "4", "6")] },
      { label: "D — Guarda", exercicios: [ex("Isometria de Ombro na Polia", "4", "45s"), ex("Desenvolvimento com Halteres", "3", "12")] },
      { label: "E — Recuperação", exercicios: [ex("Esteira Leve Zona 2", "1", "30min"), ex("Alongamento e Mobilidade", "1", "15min")] },
    ],
  },
  {
    id: "mt-av-6x", modalidade: "muay_thai", nivel: "Avançado", freq: 6,
    label: "Muay Thai 6x — Microciclo Profissional",
    dias: [
      { label: "Seg — Potência Superiores", exercicios: [ex("Push Press", "5", "4"), ex("Landmine Punch", "4", "5")] },
      { label: "Ter — Potência Inferiores", exercicios: [ex("Jump Squats", "5", "6"), ex("Leg Press Explosivo", "4", "8")] },
      { label: "Qua — Cardio Base", exercicios: [ex("Esteira Zona 2", "1", "45min")] },
      { label: "Qui — Rotacional & Core", exercicios: [ex("Landmine Rotation", "4", "8"), ex("Abdominal Roda", "4", "12")] },
      { label: "Sex — Simulador de Rounds", exercicios: [ex("Circuito de Aparelhos", "5", "3min")] },
      { label: "Sáb — Prevenção", exercicios: [ex("Treino Cervical com Anilha", "4", "15"), ex("Manguito Rotador no Cabo", "3", "15")] },
    ],
  },

  // ==================== BOXE ====================
  {
    id: "boxe-ini-2x", modalidade: "boxe", nivel: "Iniciante", freq: 2,
    label: "Boxe 2x — Full Body Base",
    dias: [
      { label: "A — Base de Quadril & Ombro", exercicios: [
        ex("Agachamento Livre com Barra", "4", "8", "Força e base nos pés"),
        ex("Desenvolvimento Militar com Barra", "3", "8", "Sustentação de guarda"),
        ex("Supino Reto com Halteres", "3", "8"),
        ex("Landmine Rotation", "3", "10", "Torque de tronco"),
        ex("Prancha Abdominal", "3", "60s"),
      ]},
      { label: "B — Puxada & Explosão", exercicios: [
        ex("Passada/Avanço com Halteres", "3", "10"), ex("Flexão de Braço Explosiva", "3", "8"),
        ex("Barra Fixa ou Puxada Alta Neutra", "3", "8"), ex("Cable Woodchopper", "3", "10"),
        ex("Elevação Lateral Isométrica com Halter Leve", "3", "45s"),
      ]},
    ],
  },
  {
    id: "boxe-ini-3x", modalidade: "boxe", nivel: "Iniciante", freq: 3,
    label: "Boxe 3x — Full Body A/B/C",
    dias: [
      { label: "A — Base & Torque", exercicios: [ex("Agachamento Livre", "4", "8"), ex("Supino Reto com Halteres", "3", "10"), ex("Remada Baixa no Cabo", "3", "12"), ex("Landmine Rotation", "3", "10")] },
      { label: "B — Deslocamento & Guarda", exercicios: [ex("Passada com Halteres", "3", "10"), ex("Desenvolvimento Militar", "3", "8"), ex("Barra Fixa", "3", "8"), ex("Abdominal Canivete", "3", "15")] },
      { label: "C — Posterior & Rotação", exercicios: [ex("Stiff com Barra", "3", "10"), ex("Flexão de Braço Explosiva", "3", "8"), ex("Cable Woodchopper", "3", "10"), ex("Isometria de Ombro", "3", "45s")] },
    ],
  },
  {
    id: "boxe-ini-4x", modalidade: "boxe", nivel: "Iniciante", freq: 4,
    label: "Boxe 4x — Upper / Lower",
    dias: [
      { label: "A — Membros Superiores", exercicios: [ex("Desenvolvimento Militar", "4", "8"), ex("Flexão Explosiva", "3", "8"), ex("Remada Curvada com Halteres", "3", "10"), ex("Face Pull no Cabo", "3", "15")] },
      { label: "B — Inferiores & Core", exercicios: [ex("Agachamento Livre", "4", "8"), ex("Stiff", "3", "10"), ex("Passada Lateral", "3", "10"), ex("Landmine Rotation", "3", "10")] },
      { label: "C — Superiores (Resistência)", exercicios: [ex("Supino Reto com Halteres", "3", "12"), ex("Puxada Alta", "3", "12"), ex("Elevação Lateral Isométrica", "3", "45s"), ex("Tríceps Pulley", "3", "15")] },
      { label: "D — Inferiores & Core", exercicios: [ex("Leg Press 45°", "4", "12"), ex("Agachamento Búlgaro", "3", "10"), ex("Abdominal Roda", "3", "12"), ex("Cable Woodchopper", "3", "10")] },
    ],
  },
  {
    id: "boxe-int-3x", modalidade: "boxe", nivel: "Intermediário", freq: 3,
    label: "Boxe 3x — Rotacional / Explosão / Ombro de Aço",
    dias: [
      { label: "A — Potência Rotacional & Torque", exercicios: [ex("Landmine Rotation com Carga", "4", "6"), ex("Supino Reto em Velocidade (50%)", "4", "5"), ex("Cable Woodchopper Rápido", "3", "8"), ex("Abdominal Infra na Barra Fixa", "3", "12")] },
      { label: "B — Explosão de Pernas", exercicios: [ex("Agachamento Salto com Halteres Leves", "4", "6"), ex("Passada Explosiva Alternada", "3", "8"), ex("Leg Press Unilateral em Velocidade", "3", "10"), ex("Prancha Lateral Dinâmica", "3", "45s")] },
      { label: "C — Resistência de Ombro & Tríceps", exercicios: [ex("Desenvolvimento com Halteres Alternado", "3", "12"), ex("Soco Direto na Polia/Crossover", "4", "30s"), ex("Paralelas (Dips)", "3", "10"), ex("Elevação Frontal e Lateral Isométrica no Cabo", "3", "45s")] },
    ],
  },
  {
    id: "boxe-int-4x", modalidade: "boxe", nivel: "Intermediário", freq: 4,
    label: "Boxe 4x — Força / Potência / Crossover / Core",
    dias: [
      { label: "A — Força Máxima", exercicios: [ex("Supino Reto com Barra", "4", "6"), ex("Remada Pendlay", "4", "8"), ex("Desenvolvimento Militar", "3", "8"), ex("Abdominal Roda", "3", "12")] },
      { label: "B — Potência de Trocação", exercicios: [ex("Landmine Press Unilateral Explosivo", "4", "6"), ex("Flexão Pliométrica", "4", "6"), ex("Agachamento Salto", "4", "6"), ex("Rotação no Cabo", "3", "10")] },
      { label: "C — Força de Pernas e Core", exercicios: [ex("Agachamento Frontal", "4", "8"), ex("Stiff com Barra", "3", "10"), ex("Leg Press", "3", "12"), ex("Landmine Rotation", "3", "10")] },
      { label: "D — Resistência na Polia", exercicios: [ex("Soco Direto no Cabo", "4", "30s", "Circuito 4 rounds"), ex("Agachamento Livre", "4", "30s", "Circuito"), ex("Isometria de Ombro", "4", "30s", "Circuito")] },
    ],
  },
  {
    id: "boxe-int-5x", modalidade: "boxe", nivel: "Intermediário", freq: 5,
    label: "Boxe 5x — Por Valência",
    dias: [
      { label: "A — Potência de Pernas/Avanço", exercicios: [ex("Jump Squats", "4", "6"), ex("Passada Explosiva", "3", "8"), ex("Leg Press", "3", "12")] },
      { label: "B — Potência de Soco", exercicios: [ex("Landmine Press Unilateral", "4", "6"), ex("Supino Explosivo", "4", "5"), ex("Puxada Alta no Crossover", "3", "10")] },
      { label: "C — Core Rotacional", exercicios: [ex("Landmine Rotation", "4", "8"), ex("Cable Woodchopper", "4", "10"), ex("Abdominal Dragon Flag", "3", "8")] },
      { label: "D — Resistência de Guarda", exercicios: [ex("Desenvolvimento Alternado", "4", "12"), ex("Isometria no Cabo", "3", "45s"), ex("Flexão Fechada", "3", "12")] },
      { label: "E — Cardio Metabólico", exercicios: [ex("Sprints na Esteira em Inclinação", "14", "30s", "30s de descanso")] },
    ],
  },
  {
    id: "boxe-av-4x", modalidade: "boxe", nivel: "Avançado", freq: 4,
    label: "Boxe 4x — Camp de Alta Performance",
    dias: [
      { label: "A — Cadeia Cinética (Pernas → Mãos)", exercicios: [ex("Push Press com Barra", "4", "4"), ex("Landmine Punch", "4", "5"), ex("Puxada Unilateral no Cabo em Velocidade", "4", "6"), ex("Jump Squat com Barra", "4", "4")] },
      { label: "B — Simulador Metabólico de Rounds", exercicios: [ex("Soco Direto no Crossover", "5", "1min", "3-5 rounds de 3min"), ex("Passada Rápida com Halteres", "5", "1min", "Circuito"), ex("Abdominal Canivete / Roda", "5", "1min", "Circuito")] },
      { label: "C — Potência Rotacional Extrema", exercicios: [ex("Landmine Rotation Pesado", "4", "5"), ex("Cable Woodchopper Explosivo", "4", "6"), ex("Flexão Pliométrica com Palma", "4", "6")] },
      { label: "D — Absorção de Impacto & Pescoço", exercicios: [ex("Treino Cervical com Anilha", "4", "15"), ex("Manguito Rotador no Cabo", "3", "15"), ex("Mobilidade de Tornozelo e Quadril", "3", "10")] },
    ],
  },
  {
    id: "boxe-av-5x", modalidade: "boxe", nivel: "Avançado", freq: 5,
    label: "Boxe 5x — Camp Profissional",
    dias: [
      { label: "A — Explosão de Golpe", exercicios: [ex("Push Press", "5", "4"), ex("Landmine Punch", "4", "5")] },
      { label: "B — Potência de Deslocamento", exercicios: [ex("Jump Squats", "5", "6"), ex("Leg Press Unilateral", "4", "10")] },
      { label: "C — Core & Absorção", exercicios: [ex("Landmine Rotation", "4", "8"), ex("Treino Cervical com Anilha", "4", "15")] },
      { label: "D — Resistência de Rounds", exercicios: [ex("Circuito na Crossover", "5", "3min")] },
      { label: "E — Recuperação & Ombro", exercicios: [ex("Manguito Rotador no Cabo", "3", "15"), ex("Esteira Leve Zona 2", "1", "30min")] },
    ],
  },
  {
    id: "boxe-av-6x", modalidade: "boxe", nivel: "Avançado", freq: 6,
    label: "Boxe 6x — Microciclo de Atleta",
    dias: [
      { label: "Seg — Potência Superiores", exercicios: [ex("Push Press", "5", "4"), ex("Landmine Punch", "4", "5")] },
      { label: "Ter — Potência Inferiores", exercicios: [ex("Jump Squats", "5", "6"), ex("Agachamento Frontal", "4", "5")] },
      { label: "Qua — Cardio Base", exercicios: [ex("Esteira / Bicicleta Zona 2", "1", "45min")] },
      { label: "Qui — Rotacional & Pescoço", exercicios: [ex("Landmine Rotation", "4", "8"), ex("Treino Cervical com Anilha", "4", "15")] },
      { label: "Sex — Simulador Glicolítico", exercicios: [ex("Circuito de Aparelhos", "5", "3min")] },
      { label: "Sáb — Mobilidade & Manguito", exercicios: [ex("Manguito Rotador no Cabo", "3", "15"), ex("Liberação Miofascial", "1", "15min")] },
    ],
  },

  // ==================== MMA ====================
  {
    id: "mma-ini-2x", modalidade: "mma", nivel: "Iniciante", freq: 2,
    label: "MMA 2x — Full Body Híbrido",
    dias: [
      { label: "A — Base de Wrestling & Striking", exercicios: [
        ex("Power Clean com Barra", "4", "5", "Explosão de queda"), ex("Agachamento Livre com Barra", "4", "8"),
        ex("Supino Reto com Barra", "3", "8"), ex("Landmine Rotation", "3", "10"),
      ]},
      { label: "B — Força de Solo & Grade", exercicios: [
        ex("Levantamento Terra com Barra", "4", "6"), ex("Barra Fixa Neutra", "3", "8"),
        ex("Passada com Halteres", "3", "10"), ex("Farmer's Walk com Halteres", "3", "50m"),
      ]},
    ],
  },
  {
    id: "mma-ini-3x", modalidade: "mma", nivel: "Iniciante", freq: 3,
    label: "MMA 3x — Full Body A/B/C",
    dias: [
      { label: "A — Explosão & Empurrar", exercicios: [ex("Power Clean", "4", "5"), ex("Agachamento Livre", "4", "8"), ex("Supino Reto", "3", "8"), ex("Abdominal Infra", "3", "15")] },
      { label: "B — Puxar & Rotação", exercicios: [ex("Levantamento Terra", "4", "6"), ex("Barra Fixa", "3", "8"), ex("Landmine Rotation", "3", "10"), ex("Leg Press", "3", "12")] },
      { label: "C — Quadril & Grip", exercicios: [ex("Hip Thrust com Barra", "4", "8"), ex("Push Press com Barra", "3", "6"), ex("Farmer's Walk", "3", "40m"), ex("Abdominal Canivete", "3", "15")] },
    ],
  },
  {
    id: "mma-ini-4x", modalidade: "mma", nivel: "Iniciante", freq: 4,
    label: "MMA 4x — Upper / Lower",
    dias: [
      { label: "A — Upper (Striking/Clinch)", exercicios: [ex("Push Press", "4", "6"), ex("Barra Fixa Neutra", "3", "8"), ex("Supino Inclinado com Halteres", "3", "10"), ex("Face Pull no Cabo", "3", "15")] },
      { label: "B — Lower (Quedas)", exercicios: [ex("Power Clean", "4", "5"), ex("Levantamento Terra", "4", "6"), ex("Agachamento Frontal", "3", "8"), ex("Abdominal Roda", "3", "12")] },
      { label: "C — Upper (Solo/Grip)", exercicios: [ex("Remada Curvada", "4", "8"), ex("Supino Reto", "3", "8"), ex("Farmer's Walk", "3", "40m"), ex("Flexão de Braço com Anilha", "3", "10")] },
      { label: "D — Lower (Potência)", exercicios: [ex("Jump Squat com Halter", "4", "6"), ex("Hip Thrust", "4", "8"), ex("Passada Búlgaro", "3", "10"), ex("Landmine Rotation", "3", "10")] },
    ],
  },
  {
    id: "mma-int-3x", modalidade: "mma", nivel: "Intermediário", freq: 3,
    label: "MMA 3x — Força / Wrestling / Isometria",
    dias: [
      { label: "A — Força Geral", exercicios: [ex("Levantamento Terra", "4", "5"), ex("Supino Reto", "3", "6"), ex("Barra Fixa com Carga", "3", "6"), ex("Abdominal Roda", "3", "12")] },
      { label: "B — Explosão de Wrestling", exercicios: [ex("Power Clean com Barra", "4", "4"), ex("Agachamento Zercher", "4", "6"), ex("Leg Press Unilateral Explosivo", "3", "8")] },
      { label: "C — Isometria de Grade/Solo", exercicios: [ex("Agachamento Isométrico na Parede com Anilha", "3", "45s"), ex("Zercher Carry", "4", "30m"), ex("Landmine Rotation", "3", "10")] },
    ],
  },
  {
    id: "mma-int-4x", modalidade: "mma", nivel: "Intermediário", freq: 4,
    label: "MMA 4x — Força / Potência / Isometria / Condicionamento",
    dias: [
      { label: "A — Força de Base", exercicios: [ex("Agachamento Frontal", "4", "6"), ex("Levantamento Terra", "4", "5"), ex("Supino Reto", "3", "8"), ex("Barra Fixa", "3", "8")] },
      { label: "B — Potência Híbrida", exercicios: [ex("Power Clean", "4", "4"), ex("Landmine Punch", "4", "6"), ex("Jump Squats", "4", "6"), ex("Flexão Pliométrica", "3", "8")] },
      { label: "C — Isometria", exercicios: [ex("Agachamento Zercher Isométrico", "4", "30s"), ex("Farmer's Walk Heavy", "4", "30m"), ex("Treino Cervical com Anilha", "3", "15")] },
      { label: "D — Condicionamento", exercicios: [ex("Circuito Esteira + Crossover + Abdominal Roda", "3", "5min")] },
    ],
  },
  {
    id: "mma-int-5x", modalidade: "mma", nivel: "Intermediário", freq: 5,
    label: "MMA 5x — Potência / Força / Core / Condicionamento",
    dias: [
      { label: "A — Potência Máxima", exercicios: [ex("Power Clean", "5", "3"), ex("Push Press", "4", "4")] },
      { label: "B — Inferiores (Força)", exercicios: [ex("Levantamento Terra (Trap Bar ou Barra)", "5", "4"), ex("Passada Búlgaro", "3", "10")] },
      { label: "C — Superiores (Força)", exercicios: [ex("Barra Fixa com Carga", "4", "5"), ex("Supino Inclinado com Halteres", "4", "8")] },
      { label: "D — Core & Isometria", exercicios: [ex("Zercher Carry", "4", "30m"), ex("Landmine Rotation", "4", "8"), ex("Abdominal Roda", "3", "12")] },
      { label: "E — Condicionamento", exercicios: [ex("Tiro de Esteira em Inclinação", "12", "30s"), ex("Passada com Halteres", "3", "20 passos")] },
    ],
  },
  {
    id: "mma-av-4x", modalidade: "mma", nivel: "Avançado", freq: 4,
    label: "MMA 4x — Atleta em Camp",
    dias: [
      { label: "A — Potência de Queda & Nocaute", exercicios: [ex("Power Clean com Barra", "5", "3"), ex("Push Press Explosivo", "4", "4"), ex("Landmine Punch", "4", "6")] },
      { label: "B — Isometria de Grade & Solo", exercicios: [ex("Agachamento Zercher Isométrico", "4", "30s"), ex("Barra Fixa Isométrica", "4", "30s"), ex("Farmer's Walk com Carga Máxima", "4", "15m")] },
      { label: "C — Simulador de Luta (5 rounds x 5 min)", exercicios: [
        ex("Leg Press Pesado", "5", "1min", "Minuto 1 — força de grade"),
        ex("Soco Unilateral na Polia/Crossover", "5", "1min", "Minuto 2 — trocação"),
        ex("Remada Curvada com Barra", "5", "1min", "Minuto 3 — puxada de solo"),
        ex("Flexão de Braço Explosiva", "5", "1min", "Minuto 4 — ground and pound"),
        ex("Abdominal Roda ou Canivete", "5", "1min", "Minuto 5 — core · 1 min de pausa entre rounds"),
      ]},
      { label: "D — Recuperação & Pescoço", exercicios: [ex("Treino Cervical com Anilha", "4", "15", "Flexão, extensão e lateralização"), ex("Manguito Rotador no Cabo", "3", "15"), ex("Mobilidade", "3", "10")] },
    ],
  },
  {
    id: "mma-av-5x", modalidade: "mma", nivel: "Avançado", freq: 5,
    label: "MMA 5x — Camp Profissional",
    dias: [
      { label: "A — Explosão", exercicios: [ex("Power Clean", "5", "3"), ex("Jump Squats com Halter", "4", "6")] },
      { label: "B — Força de Solo", exercicios: [ex("Levantamento Terra", "5", "3"), ex("Zercher Carry", "4", "30m")] },
      { label: "C — Potência Rotacional", exercicios: [ex("Landmine Punch", "4", "6"), ex("Cable Woodchopper", "4", "8")] },
      { label: "D — Condicionamento 5 Rounds", exercicios: [ex("Circuito de Aparelhos de Musculação", "5", "5min")] },
      { label: "E — Pescoço & Prevenção", exercicios: [ex("Treino Cervical com Anilha", "4", "15"), ex("Manguito Rotador no Cabo", "3", "15")] },
    ],
  },
  {
    id: "mma-av-6x", modalidade: "mma", nivel: "Avançado", freq: 6,
    label: "MMA 6x — Microciclo Profissional",
    dias: [
      { label: "Seg — Potência", exercicios: [ex("Power Clean", "5", "3"), ex("Push Press", "4", "4")] },
      { label: "Ter — Força de Sustentação", exercicios: [ex("Agachamento Zercher", "4", "6"), ex("Farmer's Walk", "4", "30m")] },
      { label: "Qua — Cardio Aeróbico", exercicios: [ex("Esteira / Bicicleta Ergométrica", "1", "45min")] },
      { label: "Qui — Potência Rotacional", exercicios: [ex("Landmine Punch", "4", "6"), ex("Landmine Rotation", "4", "8")] },
      { label: "Sex — Simulador Glicolítico", exercicios: [ex("Circuito de Aparelhos", "5", "5min")] },
      { label: "Sáb — Pescoço & Recuperação", exercicios: [ex("Treino Cervical com Anilha", "4", "15"), ex("Mobilidade", "3", "10")] },
    ],
  },
];

/** Filtra presets por modalidade + nível, ordenando os que casam com a frequência desejada. */
export const filtrarFightPresets = (
  modalidade: string,
  nivel: string,
  frequencia: number,
): FightDivisaoPreset[] => {
  const m = norm(modalidade);
  const n = norm(nivel);
  const nivelAlvo = n.includes("alto") || n.startsWith("avan") ? "avancado" : n.startsWith("inter") ? "intermediario" : "iniciante";
  return FIGHT_DIVISOES_PRESETS.filter(
    (p) => norm(p.modalidade) === m && norm(p.nivel) === nivelAlvo,
  ).sort((a, b) => Math.abs(a.freq - frequencia) - Math.abs(b.freq - frequencia));
};
