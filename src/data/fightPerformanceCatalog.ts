// Catálogo de treinos de alta performance por modalidade de combate.
// Usado na tela de Treino dos tenants vertical = 'fight' (não competidores + competidores).

export type FightExercise = {
  nome: string;
  descricao: string;
  video_url?: string | null;
};

export type FightValencia = {
  titulo: string;      // Ex: "POTÊNCIA DE QUADRIL"
  exercicios: FightExercise[];
};

export type FightModalityBlock = {
  subtitulo: string;   // texto dinâmico abaixo do header
  valencias: FightValencia[];
};

export const FIGHT_PERFORMANCE_CATALOG: Record<string, FightModalityBlock> = {
  BJJ: {
    subtitulo: "4 blocos • Grip, isometria de core e potência de quadril para passagens, raspagens e finalizações",
    valencias: [
      {
        titulo: "FORÇA DE PEGADA & ISOMETRIA DE CORE",
        exercicios: [
          {
            nome: "Barra Fixa com Lapela / Keikogi",
            descricao: "Suspensão pela lapela do kimono — foco em grip e antebraço. 4x até a falha, descanso 90s.",
            video_url: "https://www.youtube.com/watch?v=eGo4IYlbE5g",
          },
          {
            nome: "Abdominal Canivete na Fita de Suspensão",
            descricao: "TRX/argolas — estabilidade de core anti-extensão essencial para guarda e passagem. 4x10-12.",
            video_url: "https://www.youtube.com/watch?v=6uT8p2wm0Ic",
          },
        ],
      },
      {
        titulo: "POTÊNCIA DE QUADRIL",
        exercicios: [
          {
            nome: "Levantamento Terra / Deadlift",
            descricao: "Cadeia posterior para passadores e guardeiros. 5x5 pesado, descanso 2-3min.",
            video_url: "https://www.youtube.com/watch?v=op9kVnSso6Q",
          },
          {
            nome: "Elevação de Quadril com Carga / Hip Thrust",
            descricao: "Potência para raspagens, pontes e recomposição de guarda. 4x8-10 com pausa isométrica no topo.",
            video_url: "https://www.youtube.com/watch?v=xDmFkJxPzeM",
          },
        ],
      },
    ],
  },
  "Muay Thai": {
    subtitulo: "4 blocos • Torque rotacional e resistência explosiva para socos, chutes e clinch",
    valencias: [
      {
        titulo: "POTÊNCIA ROTACIONAL",
        exercicios: [
          {
            nome: "Arremesso de Medicine Ball Rotacional na Parede",
            descricao: "Gera potência dos socos e chutes rodados. 4x8 cada lado — explosivo.",
            video_url: "https://www.youtube.com/watch?v=U7Q0BbGx3zg",
          },
          {
            nome: "Landmine Rotation",
            descricao: "Core rotacional para absorção e aplicação de golpes. 4x10 cada lado.",
            video_url: "https://www.youtube.com/watch?v=D6JeoIYyzhY",
          },
        ],
      },
      {
        titulo: "RESISTÊNCIA EXPLOSIVA",
        exercicios: [
          {
            nome: "Agachamento Salto / Jump Squat",
            descricao: "Explosão para chutes altos e deslocamento tático. 5x6 máximo esforço.",
            video_url: "https://www.youtube.com/watch?v=CVaEhXotL7M",
          },
          {
            nome: "Desenvolvimento em Pé com Barra / Overhead Press",
            descricao: "Resistência para manter a guarda alta 5 rounds. 4x8-10.",
            video_url: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
          },
        ],
      },
    ],
  },
  Boxe: {
    subtitulo: "4 blocos • Torque rotacional e resistência explosiva para socos, esquivas e mobilidade",
    valencias: [
      {
        titulo: "POTÊNCIA ROTACIONAL",
        exercicios: [
          {
            nome: "Arremesso de Medicine Ball Rotacional na Parede",
            descricao: "Gera potência do cruzado e do gancho. 4x8 cada lado.",
            video_url: "https://www.youtube.com/watch?v=U7Q0BbGx3zg",
          },
          {
            nome: "Landmine Rotation",
            descricao: "Core rotacional para transferência de força quadril→ombro. 4x10 cada lado.",
            video_url: "https://www.youtube.com/watch?v=D6JeoIYyzhY",
          },
        ],
      },
      {
        titulo: "RESISTÊNCIA EXPLOSIVA",
        exercicios: [
          {
            nome: "Agachamento Salto / Jump Squat",
            descricao: "Mobilidade e explosão de deslocamento no ringue. 5x6.",
            video_url: "https://www.youtube.com/watch?v=CVaEhXotL7M",
          },
          {
            nome: "Desenvolvimento em Pé / Overhead Press",
            descricao: "Sustentação da guarda alta em rounds longos. 4x8-10.",
            video_url: "https://www.youtube.com/watch?v=2yjwXTZQDDI",
          },
        ],
      },
    ],
  },
  MMA: {
    subtitulo: "4 blocos • Transferência de força e wrestling drills para queda, ground and pound e clinch",
    valencias: [
      {
        titulo: "TRANSFERÊNCIA DE FORÇA",
        exercicios: [
          {
            nome: "Power Clean / Segundo Tempo",
            descricao: "Potência máxima triple-extension para quedas e transições. 5x3 pesado.",
            video_url: "https://www.youtube.com/watch?v=Kt2iMLiZLBk",
          },
          {
            nome: "Flexão Batendo Palma / Plyo Push-up",
            descricao: "Empurrão explosivo no ground and pound. 5x6-8.",
            video_url: "https://www.youtube.com/watch?v=Kd_DUsMJIsc",
          },
        ],
      },
      {
        titulo: "WRESTLING DRILLS",
        exercicios: [
          {
            nome: "Sprawl com Sled / Trenó de Carga",
            descricao: "Velocidade e explosão de defesa de queda. 6x20m alternando sprawl+empurrão.",
            video_url: "https://www.youtube.com/watch?v=x1LMhI7VpZ0",
          },
          {
            nome: "Farmer's Walk / Caminhada do Fazendeiro",
            descricao: "Isometria geral e sustentação na grade/clinch. 4x40m pesado.",
            video_url: "https://www.youtube.com/watch?v=Fkzk_RqlYig",
          },
        ],
      },
    ],
  },
};

export const getFightBlock = (modalidade: string): FightModalityBlock | null => {
  const key = Object.keys(FIGHT_PERFORMANCE_CATALOG).find(
    (k) => k.toLowerCase() === modalidade.toLowerCase(),
  );
  return key ? FIGHT_PERFORMANCE_CATALOG[key] : null;
};
