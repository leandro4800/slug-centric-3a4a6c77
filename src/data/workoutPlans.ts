// Auto-gerado a partir do material técnico "Metodologia Alpha".
// NÃO EDITAR MANUALMENTE - regenere via scripts/parse_plans.mjs

export interface ExercicioPlano { nome: string; detalhes: string[]; }
export interface TreinoPlano { nome: string; exercicios: ExercicioPlano[]; }
export interface PlanoTreino {
  id: string;
  title: string;
  categoria: string;
  recomendacoes: string;
  divisao: string[];
  workouts: TreinoPlano[];
}

export const WORKOUT_PLANS: PlanoTreino[] = [
  {
    "id": "plano_2",
    "title": "ADAPTAÇÃO MUSCULAR (2X NA SEMANA)",
    "categoria": "Iniciante",
    "recomendacoes": "INICIANTES: Considero essa planilha a primeira etapa de treino para quem está iniciando na musculação. O objetivo dessa etapa é ganhar coordenação de movimento, consciência muscular e dar aquela 'acordada' no físico. OBJETIVO NÃO É TREINAR ATÉ A FALHA, NÃO É FICAR COM MUSCULATURA DOLORIDA. Cerca de 4 semanas sem perder treino será o suficiente para ir para a segunda etapa. *SE VOCÊ É ALGUÉM QUE NUNCA FEZ NENHUMA ATIVIDADE FÍSICA OU ESTÁ HÁ MUITO TEMPO SEDENTÁRIO, sugiro fazer na semana 1 apenas 1 série de cada exercício, na semana 2 realizar 2 séries de cada exercício e na semana 3 e 4 realizar 3 séries de cada exercício.",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO B",
      "SEXTA: DESCANSO",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "Treino",
        "exercicios": [
          {
            "nome": "Supino reto",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Leg 45",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Pulley frente triângulo",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Panturrilha máquina",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Rosca direta sentado com halteres",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_3",
    "title": "INICIANTES (2X NA SEMANA) - ETAPA 2",
    "categoria": "Iniciante",
    "recomendacoes": "INICIANTES: Considero essa planilha a segunda etapa de treino para quem está iniciando na musculação, quem já fez a etapa de adaptação muscular. Depois de cerca de 4 semanas poderia progredir para essa programação.",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO B",
      "SEXTA: DESCANSO",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Membros Superiores)",
        "exercicios": [
          {
            "nome": "Supino inclinado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Supino reto",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Pulley frente aberto",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Remada baixa triangulo",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Desenvolvimento sentado halteres",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Rosca direta barra",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Membros Inferiores + Core)",
        "exercicios": [
          {
            "nome": "Leg 45",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Extensor",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou no smith com step",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Abdominal supra no solo",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_4",
    "title": "INICIANTES (4X NA SEMANA) - ETAPA 3",
    "categoria": "Iniciante",
    "recomendacoes": "INICIANTES: Considero essa planilha a terceira etapa de treino para quem está iniciando na musculação, quem já fez a etapa de adaptação muscular, depois de cerca de 4 semanas a programação AB 2X SEMANA e agora vai aumentar sua frequência semanal na academia.",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO A",
      "SEXTA: TREINO B",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Membros Superiores)",
        "exercicios": [
          {
            "nome": "Supino inclinado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Supino reto",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Pulley frente aberto",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Remada baixa triangulo",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Desenvolvimento sentado halteres",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Rosca direta barra",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Membros Inferiores + Core)",
        "exercicios": [
          {
            "nome": "Leg 45",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Extensor",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou no smith com step",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          },
          {
            "nome": "Abdominal supra no solo",
            "detalhes": [
              "Séries/Repetições: 3 x 10 a 15",
              "Intervalo: 1 minuto"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_5",
    "title": "INTERMEDIÁRIOS (ABCD 4X NA SEMANA)",
    "categoria": "Intermediário",
    "recomendacoes": "Pra você que já está em um nível intermediário é muito importante que você se atente em alguns pontos fundamentais para que continue evoluindo e com segurança: - **Execução:** Você precisa dominar a execução dos exercícios. Veja os vídeos, filme suas execuções, assista suas execuções, veja e reveja até dominar. - **Séries de aquecimento:** são séries para preparar músculos e articulações para o treino. Geralmente estarão no início do treino, mas dependendo da sequência de exercícios, será preciso fazer séries de aquecimento em algum exercício específico no meio do treino. Nessas séries você vai utilizar 30% da sua carga máxima e ficar muito longe da falha. - **Séries de ajustes ou séries preparatórias:** são séries com uma carga considerável, mas ainda longe das cargas de trabalho. Você fará apenas de 4-6 movimentos, ficando bem longe da falha. Nessas séries você precisa sentir se hoje está num bom dia e se vai tentar progredir a carga. - **Série válida ou série de trabalho:** é a série que realmente vai ser contabilizada, onde você vai fazer até não conseguir levantar mais nenhuma repetição. Se está programado 6-10 movimentos, você precisa ajustar uma carga para falhar entre 6-10 movimentos. Só contabilize a série quando realmente falhar dentro do intervalo. - **Progressão de carga:** a cada semana você precisa evoluir em alguma coisa dentro se suas séries válidas, seja numa conexão melhor de movimento, em fazer 1 ou duas repetições a mais, ou com uma carga maior.",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO C",
      "SEXTA: TREINO D",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Peitoral, Bíceps e Abdômen)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 10 a 15) série de trabalho + 1 drop set"
            ]
          },
          {
            "nome": "Rosca direta barra livre ou cabo com barra",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Rosca Scott Máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Rosca direta corda",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 1 drop set"
            ]
          },
          {
            "nome": "Abdominal supra na prancha declinada",
            "detalhes": [
              "(3 x 15 a 20) (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Costas, Lombar e Panturrilha)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Remada baixa triangulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 1 drop set"
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Panturrilha máquina ou em pé no smith",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Ombros, Tríceps e Abdômen)",
        "exercicios": [
          {
            "nome": "Desenvolvimento halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Elevação frontal corda ou halteres",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Elevação unilateral cabo",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 10 a 15) série de trabalho + 1 drop set"
            ]
          },
          {
            "nome": "Tríceps testa corda",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos"
            ]
          },
          {
            "nome": "Tríceps francês",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 1 drop set"
            ]
          },
          {
            "nome": "Abdominal infra na torre",
            "detalhes": [
              "(3 x 15 a 20) (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (Pernas Completas e Panturrilha)",
        "exercicios": [
          {
            "nome": "Panturrilha sentada",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Agachamento livre",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Leg 45",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Extensor",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + drop-set"
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho + 2 rest pause de 10 segundos na última"
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_6",
    "title": "PPL ABC INTERMEDIÁRIOS (3X NA SEMANA)",
    "categoria": "Intermediário",
    "recomendacoes": "Pra você que já está em um nível intermediário é muito importante que você se atente em alguns pontos fundamentais para que continue evoluindo e com segurança: - **Execução:** Você precisa dominar a execução dos exercícios. - **Séries de aquecimento:** são séries para preparar músculos e articulações para o treino. - **Séries de ajustes ou séries preparatórias:** são séries com uma carga considerável, mas ainda longe das cargas de trabalho. - **Série válida ou série de trabalho:** é a série que realmente vai ser contabilizada, onde você vai fazer até não conseguir levantar mais nenhuma repetição. - **Progressão de carga:** a cada semana você precisa evoluir em alguma coisa dentro se suas séries válidas.",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: TREINO B",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO C",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Costas, Lombar, Bíceps e Abdômen)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triangulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 10 a 15) série de trabalho (intervalo 2) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Rosca scott máquina ou cabo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Abdominal infra na torre com 2 segundos de pico de contração",
            "detalhes": [
              "Intervalo 45 segundos",
              "3x RM (máximo repetições possíveis) (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Peitoral, Ombros, Tríceps e Panturrilha)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 10 a 15) série de trabalho (intervalo 1 minuto) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 8 a 12) série de trabalho (intervalo 1 minuto) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Tríceps corda com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Panturrilha máquina em pé com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Membros Inferiores)",
        "exercicios": [
          {
            "nome": "Extensor com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Leg 45º",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 10 reps parciais após a falha em todas as séries de trabalho"
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_7",
    "title": "INTERMEDIÁRIOS (PPL ABC 3X NA SEMANA)",
    "categoria": "Intermediário",
    "recomendacoes": "Mesmas recomendações da etapa Intermediários ABCD (foco na execução, séries de aquecimento a 30% da carga máxima, séries de ajuste de 4-6 repetições, séries de trabalho até a falha e progressão de carga contínua).",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: TREINO B",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO C",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Costas, Bíceps e Abdômen - Pull)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triangulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 10 a 15) série de trabalho (intervalo 2 minutos) + realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Rosca scott máquina ou cabo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos) + realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Abdominal infra na torre com 2 segundos de pico de contração",
            "detalhes": [
              "3x RM (máximo de repetições possíveis) (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Peito, Ombro, Tríceps e Panturrilha - Push)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) + realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 10 a 15) série de trabalho (intervalo 1 minuto) + realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(1 x 8 a 12) série de trabalho (intervalo 1 minuto) + realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Tríceps corda com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) + realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Panturrilha máquina em pé com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Pernas Completas - Legs)",
        "exercicios": [
          {
            "nome": "Extensor com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) + realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Leg 45",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) + realizar 10 reps parciais após a falha em todas as séries de trabalho"
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) + realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(1 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_8",
    "title": "ABCDE ÊNFASE EM INFERIORES (5X NA SEMANA)",
    "categoria": "Avançado",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: TREINO C",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO D",
      "SÁBADO: TREINO E",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Quadríceps, estímulo em posteriores de coxas e glúteos)",
        "exercicios": [
          {
            "nome": "Agachamento livre",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho"
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Leg 45º",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 10 a 15) série de trabalho (intervalo 2 a 3 minutos) Realizar 10 reps parciais após a falha em todas as séries de trabalho"
            ]
          },
          {
            "nome": "Extensora com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos) Realizar 2 drops na última série"
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Abdutor com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Peito, ombros e tríceps)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 10 a 15) série de trabalho (intervalo 1 minuto) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(2 x 8 a 12) série de trabalho (intervalo 1 minuto) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Tríceps corda com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Costas, bíceps e panturrilhas)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triangulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 8 a 12) série de trabalho (intervalo 2) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Hiper extensão no banco romano",
            "detalhes": [
              "(3 x 10 a 15) série de trabalho (intervalo 90 segundos)"
            ]
          },
          {
            "nome": "Rosca scott máquina com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou smith",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (Posteriores, glúteos e estímulo em quadríceps)",
        "exercicios": [
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Flexor sentado com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Abdutor com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Extensor com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) realizar 1 drop set na última série"
            ]
          }
        ]
      },
      {
        "nome": "TREINO E (UPPER BODY E PANTURRILHAS)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Desenvolvimento halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Rosca scott maquina ou no cabo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Tríceps francês com corda",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos) + 1 drop na última série"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou smith",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_9",
    "title": "ABCDE ÊNFASE EM SUPERIORES (5X NA SEMANA)",
    "categoria": "Avançado",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: TREINO C",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO D",
      "SÁBADO: TREINO E",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Peito, ombros e tríceps)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 10 a 15) série de trabalho (intervalo 1 minuto) Realizar 1 dropset na última série"
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(2 x 8 a 12) série de trabalho (intervalo 1 minuto) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Tríceps francês na corda",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Costas e bíceps)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triangulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 8 a 12) série de trabalho (intervalo 2) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Hiper extensão no banco romano",
            "detalhes": [
              "(3 x 10 a 15) série de trabalho (intervalo 90 segundos)"
            ]
          },
          {
            "nome": "Rosca scott máquina com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Membros inferiores)",
        "exercicios": [
          {
            "nome": "Agachamento livre",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Leg 45",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 8 a 12) série de trabalho (intervalo 2 a 3 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Extensor com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 10 a 15) série de trabalho (intervalo 1minuto)"
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "(1 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 8 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou no smith com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 10 a 15) série de trabalho (intervalo 2 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (Ombros, estímulo em peito e tríceps)",
        "exercicios": [
          {
            "nome": "Desenvolvimento com halteres",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(2 x 10 a 15) série de trabalho (intervalo 1 minuto) realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(2 x 8 a 12) série de trabalho (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Elevação lateral máquina ou unilateral no cabo",
            "detalhes": [
              "(1 x 4 a 6) série ajuste (intervalo 1 minuto)",
              "(2 x 8 a 12) série de trabalho (intervalo 1 minuto) realizar 1 drop set na última série"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Tríceps corda com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Tríceps testa corda banco 35 graus",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2) + 2 rest pause de 10 segundos"
            ]
          }
        ]
      },
      {
        "nome": "TREINO E (Bíceps, costas e abdômen)",
        "exercicios": [
          {
            "nome": "Rosca direta cabo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Rosca scott máquina ou no cabo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 8 a 12) série de trabalho (intervalo 2 minutos) Realizar 2 rest pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Rosca direta corda",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 10 a 15) série de trabalho (intervalo 1 minuto) + 1 drop na última série"
            ]
          },
          {
            "nome": "Pulley frente aberto com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 10 a 15) série aquecimento (intervalo 1 minuto)",
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(3 x 8 a 12) série de trabalho (intervalo 2 minutos) + 1 drop na última série"
            ]
          },
          {
            "nome": "Serrote com 2 segundos de pico de contração",
            "detalhes": [
              "(1-2 x 4 a 6) série ajuste (intervalo 1 a 2 minutos)",
              "(2 x 6 a 10) série de trabalho (intervalo 2 minutos)"
            ]
          },
          {
            "nome": "Abdominal infra na torre com 2 segundos de pico de contração",
            "detalhes": [
              "Intervalo 45 segundos",
              "3x RM (máximo repetições possíveis) (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Abdominal supra na prancha declinada",
            "detalhes": [
              "Intervalo 45 segundos",
              "3x RM (máximo repetições possíveis) (intervalo 1 minuto)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_10",
    "title": "AVANÇADOS (ABCD 4X NA SEMANA)",
    "categoria": "Avançado",
    "recomendacoes": "",
    "divisao": [
      "DIA 1: TREINO A",
      "DIA 2: TREINO B",
      "DIA 3: DESCANSO",
      "DIA 4: TREINO C",
      "DIA 5: TREINO D",
      "DIA 6: DESCANSO",
      "DIA 7: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (PEITO E BÍCEPS)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 8 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1 = 1 x 8 a 10 série de trabalho",
              "S2 = 1 x 8 a 10 série de trabalho + 1 back-off set (diminuir peso 20%)"
            ]
          },
          {
            "nome": "Crucifixo máquina",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2 = 1 x 8 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1 = 1 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "E1-E2 = 2 x 8 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1 = 1 x 8 a 10 série de trabalho + 1 drop-set"
            ]
          },
          {
            "nome": "Crucifixo com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Rosca direta barra reta escala com halteres",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1 = 1 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Rosca Scott máquina",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho + 1 drop-set"
            ]
          },
          {
            "nome": "Rosca direta corda",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho"
            ]
          },
          {
            "nome": "Abdominal supra na prancha declinada",
            "detalhes": [
              "3 x 15 a 20 (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (COSTAS E TRÍCEPS)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1 = 1 x 8 a 10 série de trabalho",
              "S2 = 1 x 8 a 10 série de trabalho + 2 rest-pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Remada baixa triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Remada baixa pegada aberta na máquina com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Elevação unilateral polia",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho + 1 drop-set"
            ]
          },
          {
            "nome": "Tríceps testa corda",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)",
              "S3 = 1 x 8 a 10 série de trabalho"
            ]
          },
          {
            "nome": "Tríceps pulley",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho"
            ]
          },
          {
            "nome": "Tríceps francês",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho"
            ]
          },
          {
            "nome": "Abdominal infra na prancha",
            "detalhes": [
              "3 x 15 a 20 (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (OMBROS E PANTURRILHA)",
        "exercicios": [
          {
            "nome": "Desenvolvimento halteres ou máquina",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 8 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1 = 1 x 8 a 10 série de trabalho",
              "S2 = 1 x 8 a 10 série de trabalho + 2 rest-pause de 10 segundos"
            ]
          },
          {
            "nome": "Elevação frontal com halteres",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Elevação lateral halteres",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho + 1 drop-set na última série"
            ]
          },
          {
            "nome": "Posterior de ombro máquina ou halteres",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho"
            ]
          },
          {
            "nome": "Panturrilha em pé",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho",
              "S3 = 1 x 8 a 10 série de trabalho"
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "3 x 12 a 15 série de trabalho"
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (PERNAS COMPLETO)",
        "exercicios": [
          {
            "nome": "Agachamento livre ou smith",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1 = 1 x 8 a 10 série de trabalho",
              "S2 = 1 x 8 a 10 série de trabalho + 1 back-off set (diminuir peso 20%)"
            ]
          },
          {
            "nome": "Leg press 45",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 10 a 12 série de trabalho"
            ]
          },
          {
            "nome": "Cadeira extensora",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho + 1 drop-set na última série"
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho + 2 rest-pause de 10 segundos na última série"
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_11",
    "title": "SUPER AVANÇADOS (ABCDEF 6X NA SEMANA)",
    "categoria": "Super Avançado",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: TREINO C",
      "QUINTA: TREINO D",
      "SEXTA: TREINO E",
      "SÁBADO: TREINO F",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Posterior, glúteo e panturrilhas)",
        "exercicios": [
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série aquecimento (intervalo 1 minuto)",
              "E3-E4 = 2 x 8 a 10 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 8 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Flexor sentado com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "E1-E2 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Elevação de quadril com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 6 a 8 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Abdução com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Panturrilha em pé",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Peitoral)",
        "exercicios": [
          {
            "nome": "Crucifixo máquina",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Supino inclinado com halteres",
            "detalhes": [
              "E1-E2 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Supino inclinado na máquina",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Supino reto na máquina ou halteres",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Cross over de cima para baixo com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Flexão de braços",
            "detalhes": [
              "S1-S2 = 2 x falha (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Dorsais)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Puxada frente na polia (Pulley frente) com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Remada unilateral com halteres (Serrote)",
            "detalhes": [
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Pulldown com corda com 2 segundos de pico de contração",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Levantamento terra",
            "detalhes": [
              "E1 = 1x10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 8 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (Quadríceps)",
        "exercicios": [
          {
            "nome": "Cadeira extensora",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 12 a 15 série de trabalho (intervalo 1 a 2 minutos). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Agachamento livre ou Smith",
            "detalhes": [
              "E1-E2 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Leg press 45",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Afundo ou passada",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 passos (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Sissy squat",
            "detalhes": [
              "S1-S2 = 2 x falha (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO E (Ombros e Panturrilhas)",
        "exercicios": [
          {
            "nome": "Desenvolvimento halteres ou máquina",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Elevação lateral halteres",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Elevação lateral na polia unilateral",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Posterior de ombro máquina ou halteres",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho (intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Panturrilha em pé",
            "detalhes": [
              "E1-E2 = 2 x 12 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "S1-S2 = 2 x 12 a 15 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO F (Bíceps e Tríceps)",
        "exercicios": [
          {
            "nome": "Rosca direta com barra reta",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Tríceps testa corda",
            "detalhes": [
              "E1 = 1x15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 8 a 10 série de trabalho (intervalo 1 a 2 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Rosca Scott máquina ou halteres",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Tríceps pulley",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Rosca martelo com halteres",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          },
          {
            "nome": "Tríceps francês na polia",
            "detalhes": [
              "S1-S2 = 2 x 10 a 12 série de trabalho (intervalo 1 a 2 minutos)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_12",
    "title": "PPL ABC (COM DESCANSO)",
    "categoria": "Intermediário",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: TREINO C",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO D",
      "SÁBADO: TREINO E",
      "DOMINGO: TREINO F"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Costas e Bíceps)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 15 a 20 série aquecimento (intervalo 1 minuto)",
              "E3-E4 = 1-2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 1-2 x 8 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 1 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 8 a 10 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 1-2 x 8 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 minutos). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 8 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Rosca scott máquina ou halteres com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 minutos). Realizar 1 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Rosca direta na polia com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Abdominal infra no banco inclinado",
            "detalhes": [
              "E1-E2 = 1-2 x 8 a 10 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 15 série de trabalho (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Peito, Ombro e Tríceps)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "E1 = 1 x 15 a 20 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 10 a 12 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "E1 = 1 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Tríceps corda com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Panturrilha máquina em pé com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Pernas)",
        "exercicios": [
          {
            "nome": "Extensor com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E3-E4 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 1 rep parcial após a falha em todas as séries de trabalho."
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_13",
    "title": "PPL ABC (SEQUENCIAL)",
    "categoria": "Intermediário",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: TREINO B",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO C",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Costas, Bíceps e Abdômen)",
        "exercicios": [
          {
            "nome": "Remada curvada com barra com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E3-E4 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Remada baixa pegada aberta ou máquina pegada aberta com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Pulley frente triângulo com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Meio Terra",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Rosca scott máquina ou halteres com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 minutos). Realizar 1 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Rosca direta na polia com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Abdominal infra no banco inclinado",
            "detalhes": [
              "E1-E2 = 1-2 x 10 a 15 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 15 a 20 série de trabalho (intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Peito, Ombro, Tríceps e Panturrilha)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres ou máquina",
            "detalhes": [
              "E1 = 1-2 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Supino reto com halteres ou máquina",
            "detalhes": [
              "E1 = 1 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Supino declinado barra ou máquina",
            "detalhes": [
              "E1 = 1 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Voador com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 10 a 15 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral sentado com halteres",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Tríceps corda com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Panturrilha máquina em pé com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 10 a 15 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Pernas e Panturrilha)",
        "exercicios": [
          {
            "nome": "Extensor com 2 segundos de pico de contração",
            "detalhes": [
              "E1-E2 = 1-2 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E3-E4 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 10 reps parciais após a falha em todas as séries de trabalho."
            ]
          },
          {
            "nome": "Flexor deitado com 2 segundos de pico de contração",
            "detalhes": [
              "E1 = 1 x 10 a 15 série aquecimento (intervalo 1 minuto)",
              "E2-E3 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos). Realizar 2 rest-pause de 10 segundos na última série."
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 a 2 minutos)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto). Realizar 1 drop-set na última série."
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "E1-E2 = 1-2 x 4 a 6 série ajuste (intervalo 1 minuto)",
              "S1-S2 = 2 x 6 a 10 série de trabalho (intervalo 1 minuto)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_14",
    "title": "PARA MULHERES (AB 2X NA SEMANA)",
    "categoria": "Feminino",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO B",
      "SEXTA: DESCANSO",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A",
        "exercicios": [
          {
            "nome": "LEG 45°",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Supino reto barra",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Pulley frente triângulo",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B",
        "exercicios": [
          {
            "nome": "Extensor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Voador",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Remada baixa triângulo",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Elevação frontal",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_15",
    "title": "PARA MULHERES (AB 4X NA SEMANA)",
    "categoria": "Feminino",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO A",
      "SEXTA: TREINO B",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A",
        "exercicios": [
          {
            "nome": "Leg 45",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Extensor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Abdominal supra no solo",
            "detalhes": [
              "3 x 15 a 20 (Intervalo 1 minuto)"
            ]
          }
        ]
      },
      {
        "nome": "TREINO B",
        "exercicios": [
          {
            "nome": "Supino inclinado barra",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Pulley frente aberto",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Remada baixa triângulo",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Desenvolvimento sentado halteres",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou no smith com step",
            "detalhes": [
              "3 x 10 a 15 (Intervalo 1 minuto)"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_16",
    "title": "PARA MULHERES (AVANÇADO 3X NA SEMANA)",
    "categoria": "Feminino",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: DESCANSO",
      "QUARTA: TREINO B",
      "QUINTA: DESCANSO",
      "SEXTA: TREINO C",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Quadríceps e Glúteo)",
        "exercicios": [
          {
            "nome": "Agachamento livre ou smith",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições",
              "Intervalo: 2 minutos entre as séries.",
              "Técnica: Progressão de carga."
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 8 a 12 repetições + 2 rest pause de 10 segundos na última série.",
              "Intervalo: 90 segundos entre as séries."
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "1 x 15 repetições + 10 repetições parciais após a falha",
              "1 x 12 repetições + 10 repetições parciais após a falha",
              "1 x 10 repetições + 10 repetições parciais após a falha",
              "Intervalo: 90 segundos entre as séries."
            ]
          },
          {
            "nome": "Elevação de quadril",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração + 1 rest pause de 10 segundos em todas as séries.",
              "Intervalo: 60 segundos entre as séries."
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "5 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou smith com step",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições",
              "Técnica: Progressão de carga e drop-set na última série.",
              "Intervalo: 1 minuto entre as séries."
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Superiores e Abdômen)",
        "exercicios": [
          {
            "nome": "Abdominal supra na prancha",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis) com pico de contração.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Pulley frente aberto",
            "detalhes": [
              "4 x 10 a 15 repetições com pico de contração de 2 segundos.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Remada baixa triângulo",
            "detalhes": [
              "4 x 10 a 15 repetições com pico de contração de 2 segundos.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Supino inclinado com halteres",
            "detalhes": [
              "4 x 10 a 15 repetições.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Elevação frontal sentado com halteres",
            "detalhes": [
              "4 x 10 a 15 repetições.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Elevação lateral sentada com halteres",
            "detalhes": [
              "4 x 10 a 15 repetições + 10 repetições parciais após a falha.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "4 x 10 a 15 repetições com pico de contração de 2 segundos.",
              "Intervalo: 45 segundos."
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Posterior, Glúteo e Panturrilha)",
        "exercicios": [
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições",
              "Intervalo: 2 minutos entre as séries.",
              "Técnica: Progressão de carga."
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 8 a 12 repetições",
              "1 x 8 a 12 repetições + 2 rest pause de 10 segundos.",
              "Técnica: Pico de contração de 2 segundos.",
              "Intervalo: 90 segundos entre as séries."
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Afundo smith com step",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 45 segundos de descanso entre a troca de pernas."
            ]
          },
          {
            "nome": "Elevação de quadril",
            "detalhes": [
              "1 x 15 a 20 repetições.",
              "1 x 8 a 12 repetições + 1 rest pause de 10 segundos.",
              "1 x 8 a 12 repetições + 2 rest pause de 10 segundos.",
              "Intervalo: 60 segundos entre as séries."
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "3 x 15 a 20 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "4 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_17",
    "title": "PARA MULHERES (ÊNFASE QUADRÍCEPS 5X NA SEMANA)",
    "categoria": "Feminino",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A",
      "TERÇA: TREINO B",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO C",
      "SEXTA: TREINO D",
      "SÁBADO: TREINO E",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Quadríceps)",
        "exercicios": [
          {
            "nome": "Extensora",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 12 a 15 repetições",
              "1 x 10 a 12 repetições",
              "1 x 8 a 10 repetições",
              "Intervalo: 2 minutos entre as séries.",
              "Técnica: Progressão de carga."
            ]
          },
          {
            "nome": "Hack machine",
            "detalhes": [
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições + 2 rest pause de 10 segundos na última série.",
              "Intervalo: 2 minutos entre as séries."
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "3 x 10 a 15 repetições + 10 repetições parciais após a falha.",
              "Intervalo: 90 segundos entre as séries.",
              "Técnica: Com repetições parciais após a falha (se possível com super band)."
            ]
          },
          {
            "nome": "Extensora",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração + 2 drops na última série.",
              "Intervalo: 60 segundos entre as séries."
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 45 segundos."
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Panturrilha, Abdômen e Dorsal)",
        "exercicios": [
          {
            "nome": "Abdômen supra na prancha",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis).",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Abdômen infra na torre",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis).",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou smith com step",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 12 a 15 repetições",
              "1 x 10 a 12 repetições",
              "1 x 8 a 10 repetições + 1 drop na última série.",
              "Intervalo: 1 minuto entre as séries.",
              "Técnica: Progressão de carga e drop na última série."
            ]
          },
          {
            "nome": "Panturrilha sentado",
            "detalhes": [
              "3 x 15 a 20 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Pulley frente aberto",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          },
          {
            "nome": "Pulley frente supinado",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          },
          {
            "nome": "Remada baixa triângulo",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Posterior, Glúteo e Panturrilha)",
        "exercicios": [
          {
            "nome": "Flexor deitado",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 10 a 12 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições + 2 drops na última série.",
              "Intervalo: 2 minutos entre as séries.",
              "Técnica: Progressão de carga e drop na última série."
            ]
          },
          {
            "nome": "Flexor sentado",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 8 a 12 repetições + 1 rest pause de 10 segundos na última série.",
              "Intervalo: 1 minuto entre as séries.",
              "Técnica: Pico de contração de 2 segundos."
            ]
          },
          {
            "nome": "Agachamento smith",
            "detalhes": [
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições + 1 rest pause de 10 segundos na última série.",
              "Intervalo: 2 minutos entre as séries.",
              "Técnica: Progressão de carga e rest pause."
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 90 segundos entre as séries."
            ]
          },
          {
            "nome": "Elevação de quadril",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 10 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 6 a 10 repetições + 1 drop na última série.",
              "Intervalo: 1 minuto entre as séries.",
              "Técnica: Progressão de carga e drop na última série."
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (Superiores e Abdômen)",
        "exercicios": [
          {
            "nome": "Abdômen supra na prancha",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis).",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Abdômen infra na torre",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis).",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou smith com step",
            "detalhes": [
              "1 x 15 a 20 repetições",
              "1 x 12 a 15 repetições",
              "1 x 8 a 12 repetições",
              "1 x 8 a 12 repetições + 1 rest pause de 10 segundos na última série.",
              "Intervalo: 1 minuto entre as séries.",
              "Técnica: Progressão de carga e rest pause na última série."
            ]
          },
          {
            "nome": "Supino inclinado com halteres",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          },
          {
            "nome": "Elevação lateral sentada com halteres",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          },
          {
            "nome": "Elevação frontal sentada com halteres",
            "detalhes": [
              "3 x 10 a 15 repetições.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "3 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 45 segundos.",
              "Técnica: Parar antes da falha."
            ]
          }
        ]
      },
      {
        "nome": "TREINO E (Regenerativo/Estímulo)",
        "exercicios": [
          {
            "nome": "Extensora",
            "detalhes": [
              "6 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 60 segundos.",
              "Técnica: Parar antes da falha."
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "6 x 10 a 15 repetições com 2 segundos de pico de contração.",
              "Intervalo: 60 segundos.",
              "Técnica: Parar antes da falha."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plano_18",
    "title": "PARA MULHERES (UPPER/LOWER 4X NA SEMANA)",
    "categoria": "Feminino",
    "recomendacoes": "",
    "divisao": [
      "SEGUNDA: TREINO A (Upper 1)",
      "TERÇA: TREINO B (Lower 1)",
      "QUARTA: DESCANSO",
      "QUINTA: TREINO C (Upper 2)",
      "SEXTA: TREINO D (Lower 2)",
      "SÁBADO: DESCANSO",
      "DOMINGO: DESCANSO"
    ],
    "workouts": [
      {
        "nome": "TREINO A (Upper 1)",
        "exercicios": [
          {
            "nome": "Supino inclinado com halteres",
            "detalhes": [
              "1 x 4 a 6 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "1 a 2 séries de 2 a 4 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "2 séries de 8 a 10 repetições (Série de trabalho - Intervalo: 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Remada baixa triângulo",
            "detalhes": [
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos)"
            ]
          },
          {
            "nome": "Pulley frente aberto",
            "detalhes": [
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos)"
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "3 x 10 a 12 repetições.",
              "Intervalo: 45 a 60 segundos."
            ]
          },
          {
            "nome": "Tríceps corda",
            "detalhes": [
              "3 x 10 a 12 repetições.",
              "Intervalo: 45 a 60 segundos."
            ]
          },
          {
            "nome": "Abdominal supra",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis).",
              "Intervalo: 45 segundos."
            ]
          }
        ]
      },
      {
        "nome": "TREINO B (Lower 1)",
        "exercicios": [
          {
            "nome": "Flexora sentada",
            "detalhes": [
              "1 x 15 a 20 repetições (Série de ajuste - Intervalo: 45 a 60 segundos)",
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos)"
            ]
          },
          {
            "nome": "Agachamento smith",
            "detalhes": [
              "1 x 4 a 6 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "1 a 2 séries de 2 a 4 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "2 séries de 6 a 10 repetições (Série de trabalho - Intervalo: 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "1 x 4 a 6 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "1 a 2 séries de 2 a 4 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "2 séries de 6 a 10 repetições (Série de trabalho - Intervalo: 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Extensora",
            "detalhes": [
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos).",
              "Técnica: Realizar 2 drops na última série."
            ]
          },
          {
            "nome": "Stiff",
            "detalhes": [
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos)"
            ]
          },
          {
            "nome": "Abdutor",
            "detalhes": [
              "3 x 15 a 20 repetições.",
              "Intervalo: 45 segundos."
            ]
          }
        ]
      },
      {
        "nome": "TREINO C (Upper 2)",
        "exercicios": [
          {
            "nome": "Supino articulado",
            "detalhes": [
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos)"
            ]
          },
          {
            "nome": "Remada curvada com halteres",
            "detalhes": [
              "1 a 2 séries de 10 a 12 repetições (Série de ajuste - Intervalo: 60 a 90 segundos)",
              "2 séries de 10 a 12 repetições (Série de trabalho - Intervalo: 2 minutos)"
            ]
          },
          {
            "nome": "Desenvolvimento com halteres",
            "detalhes": [
              "3 x 10 a 12 repetições.",
              "Intervalo: 60 segundos."
            ]
          },
          {
            "nome": "Elevação lateral",
            "detalhes": [
              "3 x 10 a 12 repetições.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Tríceps francês unilateral com halter",
            "detalhes": [
              "3 x 10 a 12 repetições.",
              "Intervalo: 45 a 60 segundos."
            ]
          },
          {
            "nome": "Abdominal infra na torre",
            "detalhes": [
              "3 x RM (máximo de repetições possíveis).",
              "Intervalo: 45 segundos."
            ]
          }
        ]
      },
      {
        "nome": "TREINO D (Lower 2)",
        "exercicios": [
          {
            "nome": "Levantamento terra",
            "detalhes": [
              "1 x 4 a 6 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "1 a 2 séries de 2 a 4 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "2 séries de 6 a 8 repetições (Série de trabalho - Intervalo: 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Leg 45°",
            "detalhes": [
              "1 x 4 a 6 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "1 a 2 séries de 2 a 4 repetições (Série de ajuste - Intervalo: 90 a 120 segundos)",
              "2 séries de 8 a 10 repetições (Série de trabalho - Intervalo: 2 a 3 minutos)"
            ]
          },
          {
            "nome": "Afundo",
            "detalhes": [
              "3 x 10 a 12 repetições.",
              "Intervalo: 60 segundos entre a troca de pernas."
            ]
          },
          {
            "nome": "Adutor",
            "detalhes": [
              "3 x 15 a 20 repetições.",
              "Intervalo: 45 segundos."
            ]
          },
          {
            "nome": "Panturrilha em pé na máquina ou smith com step",
            "detalhes": [
              "4 x 10 a 15 repetições.",
              "Intervalo: 45 a 60 segundos."
            ]
          }
        ]
      }
    ]
  }
];

export const CATEGORIAS = Array.from(new Set(WORKOUT_PLANS.map(p => p.categoria)));
