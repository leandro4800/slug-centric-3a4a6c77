export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_aula_avulsa_slots: {
        Row: {
          ativo: boolean
          capacidade: number
          created_at: string
          data: string
          hora_fim: string
          hora_inicio: string
          id: string
          link_online: string | null
          local: string | null
          observacao: string | null
          reservados: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number
          created_at?: string
          data: string
          hora_fim: string
          hora_inicio: string
          id?: string
          link_online?: string | null
          local?: string | null
          observacao?: string | null
          reservados?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number
          created_at?: string
          data?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          link_online?: string | null
          local?: string | null
          observacao?: string | null
          reservados?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      agenda_presencial_slots: {
        Row: {
          ativo: boolean
          capacidade: number
          created_at: string
          data: string
          hora_fim: string
          hora_inicio: string
          id: string
          local_endereco: string | null
          local_lat: number | null
          local_lng: number | null
          local_nome: string
          reservados: number
          tenant_id: string
          tipo_aula: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade?: number
          created_at?: string
          data: string
          hora_fim: string
          hora_inicio: string
          id?: string
          local_endereco?: string | null
          local_lat?: number | null
          local_lng?: number | null
          local_nome?: string
          reservados?: number
          tenant_id: string
          tipo_aula?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade?: number
          created_at?: string
          data?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          local_endereco?: string | null
          local_lat?: number | null
          local_lng?: number | null
          local_nome?: string
          reservados?: number
          tenant_id?: string
          tipo_aula?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_presencial_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_presencial_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      agendamentos_aula_avulsa: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          slot_id: string | null
          status: string
          stripe_session_id: string | null
          telefone: string | null
          tenant_id: string
          token: string
          updated_at: string
          valor_centavos: number | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          slot_id?: string | null
          status?: string
          stripe_session_id?: string | null
          telefone?: string | null
          tenant_id: string
          token?: string
          updated_at?: string
          valor_centavos?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          slot_id?: string | null
          status?: string
          stripe_session_id?: string | null
          telefone?: string | null
          tenant_id?: string
          token?: string
          updated_at?: string
          valor_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_aula_avulsa_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "agenda_aula_avulsa_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos_presenciais: {
        Row: {
          academia_confirmada: string | null
          aluno_id: string
          created_at: string
          id: string
          notificado_em: string | null
          observacoes: string | null
          slot_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academia_confirmada?: string | null
          aluno_id: string
          created_at?: string
          id?: string
          notificado_em?: string | null
          observacoes?: string | null
          slot_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academia_confirmada?: string | null
          aluno_id?: string
          created_at?: string
          id?: string
          notificado_em?: string | null
          observacoes?: string | null
          slot_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_presenciais_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "agenda_presencial_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_presenciais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_presenciais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      alimentos_taco: {
        Row: {
          carboidrato_g: number | null
          categoria: string | null
          created_at: string | null
          energia_kcal: number | null
          fibra_g: number | null
          id: string
          lipideos_g: number | null
          nome: string
          proteina_g: number | null
        }
        Insert: {
          carboidrato_g?: number | null
          categoria?: string | null
          created_at?: string | null
          energia_kcal?: number | null
          fibra_g?: number | null
          id?: string
          lipideos_g?: number | null
          nome: string
          proteina_g?: number | null
        }
        Update: {
          carboidrato_g?: number | null
          categoria?: string | null
          created_at?: string | null
          energia_kcal?: number | null
          fibra_g?: number | null
          id?: string
          lipideos_g?: number | null
          nome?: string
          proteina_g?: number | null
        }
        Relationships: []
      }
      alunos: {
        Row: {
          created_at: string
          id: string
          nivel_experiencia: string | null
          nome: string
          objetivo: string | null
          observacoes_medicas: string | null
          profissional_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          nivel_experiencia?: string | null
          nome: string
          objetivo?: string | null
          observacoes_medicas?: string | null
          profissional_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nivel_experiencia?: string | null
          nome?: string
          objetivo?: string | null
          observacoes_medicas?: string | null
          profissional_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      analises_clinicas: {
        Row: {
          alerta_critico: boolean | null
          created_at: string
          dados_extraidos: Json
          id: string
          motivo_alerta: string | null
          nome_arquivo: string | null
          parecer_ia: string | null
          resumo_clinico: string | null
          score_performance: number | null
          status: string
          texto_extraido: string | null
          titulo: string | null
          updated_at: string
          url_arquivo: string | null
          user_id: string
        }
        Insert: {
          alerta_critico?: boolean | null
          created_at?: string
          dados_extraidos?: Json
          id?: string
          motivo_alerta?: string | null
          nome_arquivo?: string | null
          parecer_ia?: string | null
          resumo_clinico?: string | null
          score_performance?: number | null
          status?: string
          texto_extraido?: string | null
          titulo?: string | null
          updated_at?: string
          url_arquivo?: string | null
          user_id?: string
        }
        Update: {
          alerta_critico?: boolean | null
          created_at?: string
          dados_extraidos?: Json
          id?: string
          motivo_alerta?: string | null
          nome_arquivo?: string | null
          parecer_ia?: string | null
          resumo_clinico?: string | null
          score_performance?: number | null
          status?: string
          texto_extraido?: string | null
          titulo?: string | null
          updated_at?: string
          url_arquivo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      anamnese_aluno: {
        Row: {
          agua_litros: number | null
          alcool: string | null
          alimentos_ama: string | null
          alimentos_basicos_casa: string | null
          alimentos_evita: string | null
          aluno_id: string
          anos_treino: number | null
          cafe_lanche_habitual: string | null
          cirurgias: string | null
          created_at: string
          detalhes_ergogenicos: string | null
          disponibilidade_dias: string[] | null
          doencas: string[] | null
          faz_uso_ergogenicos: boolean | null
          frutas_vegetais_preferidos: string | null
          historico_familiar: string | null
          horario_almoco: string | null
          horario_jantar: string | null
          horario_treino: string | null
          horas_sono: number | null
          id: string
          lesoes_atuais: string | null
          medicamentos: string | null
          modalidades_anteriores: string[] | null
          nivel_atividade_diaria: string | null
          nivel_estresse: number | null
          nivel_experiencia: string | null
          proteinas_consumidas: string | null
          qualidade_sono: number | null
          refeicoes_dia: number | null
          restricoes_alimentares: string[] | null
          suplementos: string[] | null
          tabagismo: boolean | null
          tempo_recuperacao: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          agua_litros?: number | null
          alcool?: string | null
          alimentos_ama?: string | null
          alimentos_basicos_casa?: string | null
          alimentos_evita?: string | null
          aluno_id: string
          anos_treino?: number | null
          cafe_lanche_habitual?: string | null
          cirurgias?: string | null
          created_at?: string
          detalhes_ergogenicos?: string | null
          disponibilidade_dias?: string[] | null
          doencas?: string[] | null
          faz_uso_ergogenicos?: boolean | null
          frutas_vegetais_preferidos?: string | null
          historico_familiar?: string | null
          horario_almoco?: string | null
          horario_jantar?: string | null
          horario_treino?: string | null
          horas_sono?: number | null
          id?: string
          lesoes_atuais?: string | null
          medicamentos?: string | null
          modalidades_anteriores?: string[] | null
          nivel_atividade_diaria?: string | null
          nivel_estresse?: number | null
          nivel_experiencia?: string | null
          proteinas_consumidas?: string | null
          qualidade_sono?: number | null
          refeicoes_dia?: number | null
          restricoes_alimentares?: string[] | null
          suplementos?: string[] | null
          tabagismo?: boolean | null
          tempo_recuperacao?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          agua_litros?: number | null
          alcool?: string | null
          alimentos_ama?: string | null
          alimentos_basicos_casa?: string | null
          alimentos_evita?: string | null
          aluno_id?: string
          anos_treino?: number | null
          cafe_lanche_habitual?: string | null
          cirurgias?: string | null
          created_at?: string
          detalhes_ergogenicos?: string | null
          disponibilidade_dias?: string[] | null
          doencas?: string[] | null
          faz_uso_ergogenicos?: boolean | null
          frutas_vegetais_preferidos?: string | null
          historico_familiar?: string | null
          horario_almoco?: string | null
          horario_jantar?: string | null
          horario_treino?: string | null
          horas_sono?: number | null
          id?: string
          lesoes_atuais?: string | null
          medicamentos?: string | null
          modalidades_anteriores?: string[] | null
          nivel_atividade_diaria?: string | null
          nivel_estresse?: number | null
          nivel_experiencia?: string | null
          proteinas_consumidas?: string | null
          qualidade_sono?: number | null
          refeicoes_dia?: number | null
          restricoes_alimentares?: string[] | null
          suplementos?: string[] | null
          tabagismo?: boolean | null
          tempo_recuperacao?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnese_aluno_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnese_aluno_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          aluno_id: string
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          cancelada_em: string | null
          created_at: string
          current_period_end: string | null
          id: string
          plano_id: string | null
          status: Database["public"]["Enums"]["assinatura_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cancelada_em?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plano_id?: string | null
          status?: Database["public"]["Enums"]["assinatura_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          cancelada_em?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          plano_id?: string | null
          status?: Database["public"]["Enums"]["assinatura_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      aulas_avulsas: {
        Row: {
          aluno_id: string | null
          created_at: string
          email: string
          id: string
          nome: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          telefone: string | null
          tenant_id: string
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          telefone?: string | null
          tenant_id: string
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          aluno_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: []
      }
      avaliacao_avulsa_alunos: {
        Row: {
          altura_cm: number | null
          coach_user_id: string
          created_at: string
          data_nascimento: string | null
          dieta_json: Json | null
          email: string | null
          id: string
          nome: string
          peso_inicial_kg: number | null
          sexo: string | null
          telefone: string | null
          tenant_id: string
          treino_json: Json | null
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          coach_user_id: string
          created_at?: string
          data_nascimento?: string | null
          dieta_json?: Json | null
          email?: string | null
          id?: string
          nome: string
          peso_inicial_kg?: number | null
          sexo?: string | null
          telefone?: string | null
          tenant_id: string
          treino_json?: Json | null
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          coach_user_id?: string
          created_at?: string
          data_nascimento?: string | null
          dieta_json?: Json | null
          email?: string | null
          id?: string
          nome?: string
          peso_inicial_kg?: number | null
          sexo?: string | null
          telefone?: string | null
          tenant_id?: string
          treino_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_avulsa_alunos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_avulsa_alunos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      avaliacoes_fisicas: {
        Row: {
          altura_cm: number
          aluno_id: string
          bf_pct_calculado: number | null
          cintura_cm: number | null
          created_at: string
          data: string
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_coxa: number | null
          dobra_panturrilha: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_suprailiaca: number | null
          dobra_triceps: number | null
          foto_costas_url: string | null
          foto_frente_url: string | null
          foto_lado_url: string | null
          ia_estimativa_aviso: string | null
          ia_estimativa_bf_pct: number | null
          ia_estimativa_dobras: Json | null
          ia_estimativa_fonte_url: string | null
          ia_estimativa_prompt: string | null
          ia_estimativa_soma_mm: number | null
          id: string
          idade: number | null
          imc: number | null
          massa_gorda_kg: number | null
          massa_magra_kg: number | null
          metodo: string | null
          observacoes: string | null
          perimetro_abdomen: number | null
          perimetro_antebraco_dir: number | null
          perimetro_antebraco_esq: number | null
          perimetro_braco_contraido_dir: number | null
          perimetro_braco_contraido_esq: number | null
          perimetro_braco_relaxado_dir: number | null
          perimetro_braco_relaxado_esq: number | null
          perimetro_coxa_distal_dir: number | null
          perimetro_coxa_distal_esq: number | null
          perimetro_coxa_media_dir: number | null
          perimetro_coxa_media_esq: number | null
          perimetro_coxa_proximal_dir: number | null
          perimetro_coxa_proximal_esq: number | null
          perimetro_ombro: number | null
          perimetro_panturrilha_dir: number | null
          perimetro_panturrilha_esq: number | null
          perimetro_torax: number | null
          pescoco_cm: number | null
          peso_kg: number
          quadril_cm: number | null
          sexo: string | null
          tenant_id: string | null
        }
        Insert: {
          altura_cm: number
          aluno_id: string
          bf_pct_calculado?: number | null
          cintura_cm?: number | null
          created_at?: string
          data?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          ia_estimativa_aviso?: string | null
          ia_estimativa_bf_pct?: number | null
          ia_estimativa_dobras?: Json | null
          ia_estimativa_fonte_url?: string | null
          ia_estimativa_prompt?: string | null
          ia_estimativa_soma_mm?: number | null
          id?: string
          idade?: number | null
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          metodo?: string | null
          observacoes?: string | null
          perimetro_abdomen?: number | null
          perimetro_antebraco_dir?: number | null
          perimetro_antebraco_esq?: number | null
          perimetro_braco_contraido_dir?: number | null
          perimetro_braco_contraido_esq?: number | null
          perimetro_braco_relaxado_dir?: number | null
          perimetro_braco_relaxado_esq?: number | null
          perimetro_coxa_distal_dir?: number | null
          perimetro_coxa_distal_esq?: number | null
          perimetro_coxa_media_dir?: number | null
          perimetro_coxa_media_esq?: number | null
          perimetro_coxa_proximal_dir?: number | null
          perimetro_coxa_proximal_esq?: number | null
          perimetro_ombro?: number | null
          perimetro_panturrilha_dir?: number | null
          perimetro_panturrilha_esq?: number | null
          perimetro_torax?: number | null
          pescoco_cm?: number | null
          peso_kg: number
          quadril_cm?: number | null
          sexo?: string | null
          tenant_id?: string | null
        }
        Update: {
          altura_cm?: number
          aluno_id?: string
          bf_pct_calculado?: number | null
          cintura_cm?: number | null
          created_at?: string
          data?: string
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_panturrilha?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          ia_estimativa_aviso?: string | null
          ia_estimativa_bf_pct?: number | null
          ia_estimativa_dobras?: Json | null
          ia_estimativa_fonte_url?: string | null
          ia_estimativa_prompt?: string | null
          ia_estimativa_soma_mm?: number | null
          id?: string
          idade?: number | null
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          metodo?: string | null
          observacoes?: string | null
          perimetro_abdomen?: number | null
          perimetro_antebraco_dir?: number | null
          perimetro_antebraco_esq?: number | null
          perimetro_braco_contraido_dir?: number | null
          perimetro_braco_contraido_esq?: number | null
          perimetro_braco_relaxado_dir?: number | null
          perimetro_braco_relaxado_esq?: number | null
          perimetro_coxa_distal_dir?: number | null
          perimetro_coxa_distal_esq?: number | null
          perimetro_coxa_media_dir?: number | null
          perimetro_coxa_media_esq?: number | null
          perimetro_coxa_proximal_dir?: number | null
          perimetro_coxa_proximal_esq?: number | null
          perimetro_ombro?: number | null
          perimetro_panturrilha_dir?: number | null
          perimetro_panturrilha_esq?: number | null
          perimetro_torax?: number | null
          pescoco_cm?: number | null
          peso_kg?: number
          quadril_cm?: number | null
          sexo?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_fisicas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_fisicas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      benchmarks: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          is_global: boolean
          nome: string
          tenant_id: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          is_global?: boolean
          nome: string
          tenant_id?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          is_global?: boolean
          nome?: string
          tenant_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benchmarks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmarks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      biblioteca_abdominais_pacho: {
        Row: {
          foco: string
          id: string
          instrucao: string | null
          nome_exercicio: string
          repeticoes: string | null
          series: number | null
        }
        Insert: {
          foco: string
          id?: string
          instrucao?: string | null
          nome_exercicio: string
          repeticoes?: string | null
          series?: number | null
        }
        Update: {
          foco?: string
          id?: string
          instrucao?: string | null
          nome_exercicio?: string
          repeticoes?: string | null
          series?: number | null
        }
        Relationships: []
      }
      biblioteca_exercicios: {
        Row: {
          contraindicacoes: string[] | null
          created_at: string
          equipamento: string | null
          grupo_muscular: string
          id: string
          nivel: string | null
          nome: string
          repeticoes: string | null
          series_trabalho: number | null
          tecnica_intensidade: string | null
          tenant_id: string
          updated_at: string
          video_coach_url: string | null
          video_url: string | null
        }
        Insert: {
          contraindicacoes?: string[] | null
          created_at?: string
          equipamento?: string | null
          grupo_muscular: string
          id?: string
          nivel?: string | null
          nome: string
          repeticoes?: string | null
          series_trabalho?: number | null
          tecnica_intensidade?: string | null
          tenant_id: string
          updated_at?: string
          video_coach_url?: string | null
          video_url?: string | null
        }
        Update: {
          contraindicacoes?: string[] | null
          created_at?: string
          equipamento?: string | null
          grupo_muscular?: string
          id?: string
          nivel?: string | null
          nome?: string
          repeticoes?: string | null
          series_trabalho?: number | null
          tecnica_intensidade?: string | null
          tenant_id?: string
          updated_at?: string
          video_coach_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_exercicios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biblioteca_exercicios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      biblioteca_metodologia: {
        Row: {
          created_at: string | null
          dia_nome: string | null
          dia_ordem: number | null
          divisao_nome: string | null
          exercicio_nome: string
          grupo_muscular: string | null
          id: string
          nivel: string | null
          ordem_no_dia: number | null
          repeticoes: string | null
          series: number | null
          tecnica_id: string | null
        }
        Insert: {
          created_at?: string | null
          dia_nome?: string | null
          dia_ordem?: number | null
          divisao_nome?: string | null
          exercicio_nome: string
          grupo_muscular?: string | null
          id?: string
          nivel?: string | null
          ordem_no_dia?: number | null
          repeticoes?: string | null
          series?: number | null
          tecnica_id?: string | null
        }
        Update: {
          created_at?: string | null
          dia_nome?: string | null
          dia_ordem?: number | null
          divisao_nome?: string | null
          exercicio_nome?: string
          grupo_muscular?: string | null
          id?: string
          nivel?: string | null
          ordem_no_dia?: number | null
          repeticoes?: string | null
          series?: number | null
          tecnica_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_metodologia_tecnica_id_fkey"
            columns: ["tecnica_id"]
            isOneToOne: false
            referencedRelation: "dicionario_tecnicas"
            referencedColumns: ["id"]
          },
        ]
      }
      biblioteca_metodologia_pacho: {
        Row: {
          cadencia: string | null
          dia_ordem: number
          grupo_muscular: string
          id: string
          nivel: string
          nome_exercicio: string
          observacao_tecnica: string | null
          ordem_exercicio: number
          repeticoes: string
          series_ajuste: number | null
          series_aquecimento: number | null
          series_trabalho: number
          tecnica_especifica: string | null
          titulo_dia: string
          variante: number
        }
        Insert: {
          cadencia?: string | null
          dia_ordem: number
          grupo_muscular: string
          id?: string
          nivel: string
          nome_exercicio: string
          observacao_tecnica?: string | null
          ordem_exercicio: number
          repeticoes: string
          series_ajuste?: number | null
          series_aquecimento?: number | null
          series_trabalho: number
          tecnica_especifica?: string | null
          titulo_dia: string
          variante?: number
        }
        Update: {
          cadencia?: string | null
          dia_ordem?: number
          grupo_muscular?: string
          id?: string
          nivel?: string
          nome_exercicio?: string
          observacao_tecnica?: string | null
          ordem_exercicio?: number
          repeticoes?: string
          series_ajuste?: number | null
          series_aquecimento?: number | null
          series_trabalho?: number
          tecnica_especifica?: string | null
          titulo_dia?: string
          variante?: number
        }
        Relationships: []
      }
      biblioteca_mobilidade_pacho: {
        Row: {
          foco: string
          id: string
          instrução_tecnica: string
          nivel: string
          nome_exercicio: string
          tempo_ou_reps: string
          video_url: string | null
        }
        Insert: {
          foco: string
          id?: string
          instrução_tecnica: string
          nivel: string
          nome_exercicio: string
          tempo_ou_reps: string
          video_url?: string | null
        }
        Update: {
          foco?: string
          id?: string
          instrução_tecnica?: string
          nivel?: string
          nome_exercicio?: string
          tempo_ou_reps?: string
          video_url?: string | null
        }
        Relationships: []
      }
      biblioteca_treinos_pacho: {
        Row: {
          created_at: string
          descricao: string | null
          estrutura_json: Json | null
          id: string
          nome_template: string
          objetivo_template: string | null
          profissional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          estrutura_json?: Json | null
          id?: string
          nome_template: string
          objetivo_template?: string | null
          profissional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          estrutura_json?: Json | null
          id?: string
          nome_template?: string
          objetivo_template?: string | null
          profissional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_treinos_pacho_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      camps_luta: {
        Row: {
          aluno_id: string
          created_at: string
          data_inicio: string
          data_luta: string
          id: string
          modalidade: string | null
          nome: string
          peso_meta: number | null
          tenant_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_inicio: string
          data_luta: string
          id?: string
          modalidade?: string | null
          nome: string
          peso_meta?: number | null
          tenant_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_inicio?: string
          data_luta?: string
          id?: string
          modalidade?: string | null
          nome?: string
          peso_meta?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camps_luta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camps_luta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      cartas_atleta: {
        Row: {
          aluno_id: string
          atributos: Json
          avatar_carta_url: string | null
          bio: string | null
          conquistas: Json | null
          created_at: string
          estilo_dominante: string | null
          estilo_secundario: string | null
          foto_original_url: string | null
          id: string
          nivel: number
          numero: number
          posicao: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          atributos?: Json
          avatar_carta_url?: string | null
          bio?: string | null
          conquistas?: Json | null
          created_at?: string
          estilo_dominante?: string | null
          estilo_secundario?: string | null
          foto_original_url?: string | null
          id?: string
          nivel?: number
          numero?: number
          posicao?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          atributos?: Json
          avatar_carta_url?: string | null
          bio?: string | null
          conquistas?: Json | null
          created_at?: string
          estilo_dominante?: string | null
          estilo_secundario?: string | null
          foto_original_url?: string | null
          id?: string
          nivel?: number
          numero?: number
          posicao?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coach_automated_delivery: {
        Row: {
          created_at: string
          diet_id: string | null
          id: string
          is_active: boolean | null
          plan_id: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diet_id?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diet_id?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_marketing_config: {
        Row: {
          accent_secondary: string | null
          background_style: string | null
          branding_color: string | null
          created_at: string
          cta_text: string | null
          headline: string | null
          id: string
          instagram_handle: string | null
          location_text: string | null
          photo_url: string | null
          subheadline: string | null
          tagline: string | null
          template: string | null
          topic1_icon: string | null
          topic1_label: string | null
          topic2_icon: string | null
          topic2_label: string | null
          topic3_icon: string | null
          topic3_label: string | null
          topic4_icon: string | null
          topic4_label: string | null
          topic5_icon: string | null
          topic5_label: string | null
          topic6_icon: string | null
          topic6_label: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          accent_secondary?: string | null
          background_style?: string | null
          branding_color?: string | null
          created_at?: string
          cta_text?: string | null
          headline?: string | null
          id?: string
          instagram_handle?: string | null
          location_text?: string | null
          photo_url?: string | null
          subheadline?: string | null
          tagline?: string | null
          template?: string | null
          topic1_icon?: string | null
          topic1_label?: string | null
          topic2_icon?: string | null
          topic2_label?: string | null
          topic3_icon?: string | null
          topic3_label?: string | null
          topic4_icon?: string | null
          topic4_label?: string | null
          topic5_icon?: string | null
          topic5_label?: string | null
          topic6_icon?: string | null
          topic6_label?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          accent_secondary?: string | null
          background_style?: string | null
          branding_color?: string | null
          created_at?: string
          cta_text?: string | null
          headline?: string | null
          id?: string
          instagram_handle?: string | null
          location_text?: string | null
          photo_url?: string | null
          subheadline?: string | null
          tagline?: string | null
          template?: string | null
          topic1_icon?: string | null
          topic1_label?: string | null
          topic2_icon?: string | null
          topic2_label?: string | null
          topic3_icon?: string | null
          topic3_label?: string | null
          topic4_icon?: string | null
          topic4_label?: string | null
          topic5_icon?: string | null
          topic5_label?: string | null
          topic6_icon?: string | null
          topic6_label?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      coach_platform_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          created_at: string
          current_period_end: string | null
          fee_pct: number
          first_payment_value: number
          full_price: number
          id: string
          plan_tier: Database["public"]["Enums"]["coach_plan_tier"]
          status: Database["public"]["Enums"]["coach_sub_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          current_period_end?: string | null
          fee_pct?: number
          first_payment_value?: number
          full_price: number
          id?: string
          plan_tier: Database["public"]["Enums"]["coach_plan_tier"]
          status?: Database["public"]["Enums"]["coach_sub_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          current_period_end?: string | null
          fee_pct?: number
          first_payment_value?: number
          full_price?: number
          id?: string
          plan_tier?: Database["public"]["Enums"]["coach_plan_tier"]
          status?: Database["public"]["Enums"]["coach_sub_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_qualification_leads: {
        Row: {
          alunos_atuais: string | null
          created_at: string
          email: string | null
          faturamento_mensal: string | null
          id: string
          plano_recomendado: string | null
          profissao: string | null
          profissao_outro: string | null
          user_id: string | null
        }
        Insert: {
          alunos_atuais?: string | null
          created_at?: string
          email?: string | null
          faturamento_mensal?: string | null
          id?: string
          plano_recomendado?: string | null
          profissao?: string | null
          profissao_outro?: string | null
          user_id?: string | null
        }
        Update: {
          alunos_atuais?: string | null
          created_at?: string
          email?: string | null
          faturamento_mensal?: string | null
          id?: string
          plano_recomendado?: string | null
          profissao?: string | null
          profissao_outro?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coach_sales_links: {
        Row: {
          checkout_url: string | null
          created_at: string
          id: string
          landing_page_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checkout_url?: string | null
          created_at?: string
          id?: string
          landing_page_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checkout_url?: string | null
          created_at?: string
          id?: string
          landing_page_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comunidade_comentarios: {
        Row: {
          comentario: string
          criado_em: string | null
          id: string
          post_id: string | null
          profissional_id: string
          usuario_id: string | null
        }
        Insert: {
          comentario: string
          criado_em?: string | null
          id?: string
          post_id?: string | null
          profissional_id: string
          usuario_id?: string | null
        }
        Update: {
          comentario?: string
          criado_em?: string | null
          id?: string
          post_id?: string | null
          profissional_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comunidade_comentarios_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "comunidade_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comunidade_curtidas: {
        Row: {
          id: string
          post_id: string | null
          profissional_id: string
          usuario_id: string | null
        }
        Insert: {
          id?: string
          post_id?: string | null
          profissional_id: string
          usuario_id?: string | null
        }
        Update: {
          id?: string
          post_id?: string | null
          profissional_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comunidade_curtidas_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "comunidade_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comunidade_posts: {
        Row: {
          conteudo: string | null
          criado_em: string | null
          id: string
          imagem_url: string | null
          profissional_id: string
          tipo: string | null
          usuario_id: string | null
          video_url: string | null
        }
        Insert: {
          conteudo?: string | null
          criado_em?: string | null
          id?: string
          imagem_url?: string | null
          profissional_id: string
          tipo?: string | null
          usuario_id?: string | null
          video_url?: string | null
        }
        Update: {
          conteudo?: string | null
          criado_em?: string | null
          id?: string
          imagem_url?: string | null
          profissional_id?: string
          tipo?: string | null
          usuario_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_comunidade_posts_tenant"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comunidade_posts_tenant"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "fk_comunidade_posts_usuario"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_tenant: {
        Row: {
          chave: string
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuracoes_tenant_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      dicionario_tecnicas: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          video_explicativo: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          video_explicativo?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          video_explicativo?: string | null
        }
        Relationships: []
      }
      dietas: {
        Row: {
          analise_id: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          kcal_alvo: number | null
          macros_alvo: Json | null
          objetivo: string | null
          observacoes_clinicas: string | null
          tmb_estimada: number | null
          user_id: string
        }
        Insert: {
          analise_id?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          kcal_alvo?: number | null
          macros_alvo?: Json | null
          objetivo?: string | null
          observacoes_clinicas?: string | null
          tmb_estimada?: number | null
          user_id: string
        }
        Update: {
          analise_id?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          kcal_alvo?: number | null
          macros_alvo?: Json | null
          objetivo?: string | null
          observacoes_clinicas?: string | null
          tmb_estimada?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dietas_analise_id_fkey"
            columns: ["analise_id"]
            isOneToOne: false
            referencedRelation: "analises_clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      evolucao_checkins: {
        Row: {
          bf_percentual: number | null
          created_at: string | null
          data_checkin: string
          dobras: Json | null
          foto_costas_url: string | null
          foto_frente_url: string | null
          foto_lado_url: string | null
          id: string
          massa_gorda_kg: number | null
          massa_magra_kg: number | null
          observacoes: string | null
          peso_kg: number | null
          user_id: string
        }
        Insert: {
          bf_percentual?: number | null
          created_at?: string | null
          data_checkin?: string
          dobras?: Json | null
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          id?: string
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          peso_kg?: number | null
          user_id: string
        }
        Update: {
          bf_percentual?: number | null
          created_at?: string | null
          data_checkin?: string
          dobras?: Json | null
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          id?: string
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          peso_kg?: number | null
          user_id?: string
        }
        Relationships: []
      }
      evolucao_fotos: {
        Row: {
          data_foto: string | null
          data_registro: string | null
          id: string
          legenda: string | null
          tipo: string | null
          url_foto: string
          user_id: string | null
        }
        Insert: {
          data_foto?: string | null
          data_registro?: string | null
          id?: string
          legenda?: string | null
          tipo?: string | null
          url_foto: string
          user_id?: string | null
        }
        Update: {
          data_foto?: string | null
          data_registro?: string | null
          id?: string
          legenda?: string | null
          tipo?: string | null
          url_foto?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evolucao_metricas: {
        Row: {
          bf: number | null
          braco: number | null
          cintura: number | null
          data_registro: string | null
          dobra_abdominal: number | null
          dobra_axilar_media: number | null
          dobra_coxa: number | null
          dobra_peitoral: number | null
          dobra_subescapular: number | null
          dobra_suprailiaca: number | null
          dobra_triceps: number | null
          id: string
          massa_gorda: number | null
          massa_magra: number | null
          peso: number | null
          user_id: string | null
          usuario_id: string | null
        }
        Insert: {
          bf?: number | null
          braco?: number | null
          cintura?: number | null
          data_registro?: string | null
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          id?: string
          massa_gorda?: number | null
          massa_magra?: number | null
          peso?: number | null
          user_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          bf?: number | null
          braco?: number | null
          cintura?: number | null
          data_registro?: string | null
          dobra_abdominal?: number | null
          dobra_axilar_media?: number | null
          dobra_coxa?: number | null
          dobra_peitoral?: number | null
          dobra_subescapular?: number | null
          dobra_suprailiaca?: number | null
          dobra_triceps?: number | null
          id?: string
          massa_gorda?: number | null
          massa_magra?: number | null
          peso?: number | null
          user_id?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      exames_biomarcadores: {
        Row: {
          analise_id: string | null
          classificacao: string | null
          codigo: string | null
          created_at: string
          data_exame: string | null
          id: string
          nome: string
          observacao: string | null
          unidade: string | null
          user_id: string
          valor: number | null
          valor_referencia: string | null
        }
        Insert: {
          analise_id?: string | null
          classificacao?: string | null
          codigo?: string | null
          created_at?: string
          data_exame?: string | null
          id?: string
          nome: string
          observacao?: string | null
          unidade?: string | null
          user_id?: string
          valor?: number | null
          valor_referencia?: string | null
        }
        Update: {
          analise_id?: string | null
          classificacao?: string | null
          codigo?: string | null
          created_at?: string
          data_exame?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          unidade?: string | null
          user_id?: string
          valor?: number | null
          valor_referencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exames_biomarcadores_analise_id_fkey"
            columns: ["analise_id"]
            isOneToOne: false
            referencedRelation: "analises_clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      fight_nutrition_fases: {
        Row: {
          aluno_id: string
          camp_id: string | null
          carboidrato_g: number | null
          created_at: string
          data_fim: string
          data_inicio: string
          fase: Database["public"]["Enums"]["fight_nutrition_fase"]
          id: string
          kcal_meta: number | null
          lipideos_g: number | null
          observacoes: string | null
          peso_meta_kg: number | null
          proteina_g: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          camp_id?: string | null
          carboidrato_g?: number | null
          created_at?: string
          data_fim: string
          data_inicio: string
          fase: Database["public"]["Enums"]["fight_nutrition_fase"]
          id?: string
          kcal_meta?: number | null
          lipideos_g?: number | null
          observacoes?: string | null
          peso_meta_kg?: number | null
          proteina_g?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          camp_id?: string | null
          carboidrato_g?: number | null
          created_at?: string
          data_fim?: string
          data_inicio?: string
          fase?: Database["public"]["Enums"]["fight_nutrition_fase"]
          id?: string
          kcal_meta?: number | null
          lipideos_g?: number | null
          observacoes?: string | null
          peso_meta_kg?: number | null
          proteina_g?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fight_nutrition_fases_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps_luta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fight_nutrition_fases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fight_nutrition_fases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      historico_cargas: {
        Row: {
          carga_kg: number
          created_at: string
          data_treino: string
          exercicio_nome: string
          id: string
          repeticoes_feitas: number
          serie_index: number | null
          tenant_id: string
          tipo_serie: string | null
          user_id: string
        }
        Insert: {
          carga_kg?: number
          created_at?: string
          data_treino?: string
          exercicio_nome: string
          id?: string
          repeticoes_feitas?: number
          serie_index?: number | null
          tenant_id: string
          tipo_serie?: string | null
          user_id: string
        }
        Update: {
          carga_kg?: number
          created_at?: string
          data_treino?: string
          exercicio_nome?: string
          id?: string
          repeticoes_feitas?: number
          serie_index?: number | null
          tenant_id?: string
          tipo_serie?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_cargas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_cargas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      inteligencia_clinica: {
        Row: {
          biomarcador_codigo: string
          condicao: string
          created_at: string
          id: string
          interpretacao: string | null
          possiveis_causas: string | null
          prioridade: string | null
          sugestao_conduta: string | null
        }
        Insert: {
          biomarcador_codigo: string
          condicao: string
          created_at?: string
          id?: string
          interpretacao?: string | null
          possiveis_causas?: string | null
          prioridade?: string | null
          sugestao_conduta?: string | null
        }
        Update: {
          biomarcador_codigo?: string
          condicao?: string
          created_at?: string
          id?: string
          interpretacao?: string | null
          possiveis_causas?: string | null
          prioridade?: string | null
          sugestao_conduta?: string | null
        }
        Relationships: []
      }
      itens_refeicao: {
        Row: {
          alimento_id: string | null
          created_at: string | null
          id: string
          quantidade_g: number | null
          refeicao_id: string | null
          substituicoes: string | null
        }
        Insert: {
          alimento_id?: string | null
          created_at?: string | null
          id?: string
          quantidade_g?: number | null
          refeicao_id?: string | null
          substituicoes?: string | null
        }
        Update: {
          alimento_id?: string | null
          created_at?: string | null
          id?: string
          quantidade_g?: number | null
          refeicao_id?: string | null
          substituicoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_refeicao_alimento_id_fkey"
            columns: ["alimento_id"]
            isOneToOne: false
            referencedRelation: "alimentos_taco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_refeicao_refeicao_id_fkey"
            columns: ["refeicao_id"]
            isOneToOne: false
            referencedRelation: "refeicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      link_reivindicacao_usos: {
        Row: {
          aluno_id: string
          created_at: string
          id: string
          token: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          id?: string
          token: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      menu_templates: {
        Row: {
          created_at: string | null
          id: string
          level: string
          meal_count: number | null
          meal_structure: Json
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: string
          meal_count?: number | null
          meal_structure: Json
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: string
          meal_count?: number | null
          meal_structure?: Json
          name?: string
        }
        Relationships: []
      }
      metodologia_pacho_config: {
        Row: {
          intensidade_esforc_percebido: number | null
          objetivo: string | null
          percentual_carga: number | null
          repeticoes_alvo: string | null
          tipo_serie: string
        }
        Insert: {
          intensidade_esforc_percebido?: number | null
          objetivo?: string | null
          percentual_carga?: number | null
          repeticoes_alvo?: string | null
          tipo_serie: string
        }
        Update: {
          intensidade_esforc_percebido?: number | null
          objetivo?: string | null
          percentual_carga?: number | null
          repeticoes_alvo?: string | null
          tipo_serie?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          id: string
          reference_id: string | null
          sent_at: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          reference_id?: string | null
          sent_at?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          reference_id?: string | null
          sent_at?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parceiros: {
        Row: {
          ativo: boolean
          created_at: string
          cupom: string | null
          id: string
          logo_url: string | null
          nome: string
          ordem: number
          tenant_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          cupom?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          ordem?: number
          tenant_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          cupom?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          ordem?: number
          tenant_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parceiros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parceiros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      perfis: {
        Row: {
          avatar_celebracao_url: string | null
          avatar_pos_y: number | null
          avatar_treinando_url: string | null
          avatar_url: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          music_url: string | null
          nome_completo: string | null
          onboarding_completo: boolean
          push_token: string | null
          sexo: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_celebracao_url?: string | null
          avatar_pos_y?: number | null
          avatar_treinando_url?: string | null
          avatar_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id: string
          music_url?: string | null
          nome_completo?: string | null
          onboarding_completo?: boolean
          push_token?: string | null
          sexo?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_celebracao_url?: string | null
          avatar_pos_y?: number | null
          avatar_treinando_url?: string | null
          avatar_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          music_url?: string | null
          nome_completo?: string | null
          onboarding_completo?: boolean
          push_token?: string | null
          sexo?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      perfis_treino: {
        Row: {
          altura_cm: number | null
          aluno_id: string
          bf_pct: number | null
          cintura_cm: number | null
          created_at: string
          frequencia_semanal: number | null
          id: string
          idade: number | null
          lesoes: string[] | null
          limitacoes: string[] | null
          objetivo: string | null
          pescoco_cm: number | null
          peso_kg: number | null
          quadril_cm: number | null
          sexo: string | null
          tempo_treino: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          aluno_id: string
          bf_pct?: number | null
          cintura_cm?: number | null
          created_at?: string
          frequencia_semanal?: number | null
          id?: string
          idade?: number | null
          lesoes?: string[] | null
          limitacoes?: string[] | null
          objetivo?: string | null
          pescoco_cm?: number | null
          peso_kg?: number | null
          quadril_cm?: number | null
          sexo?: string | null
          tempo_treino?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          aluno_id?: string
          bf_pct?: number | null
          cintura_cm?: number | null
          created_at?: string
          frequencia_semanal?: number | null
          id?: string
          idade?: number | null
          lesoes?: string[] | null
          limitacoes?: string[] | null
          objetivo?: string | null
          pescoco_cm?: number | null
          peso_kg?: number | null
          quadril_cm?: number | null
          sexo?: string | null
          tempo_treino?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_treino_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfis_treino_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      peso_diario: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          id: string
          observacoes: string | null
          peso: number
          tenant_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          peso: number
          tenant_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          id?: string
          observacoes?: string | null
          peso?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peso_diario_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peso_diario_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      planos: {
        Row: {
          asaas_id: string | null
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          intervalo: Database["public"]["Enums"]["plano_intervalo"]
          nome: string
          ordem: number
          preco_centavos: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          tenant_id: string
          updated_at: string
          vertical: Database["public"]["Enums"]["tenant_vertical"]
        }
        Insert: {
          asaas_id?: string | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          intervalo?: Database["public"]["Enums"]["plano_intervalo"]
          nome: string
          ordem?: number
          preco_centavos: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tenant_id: string
          updated_at?: string
          vertical?: Database["public"]["Enums"]["tenant_vertical"]
        }
        Update: {
          asaas_id?: string | null
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          intervalo?: Database["public"]["Enums"]["plano_intervalo"]
          nome?: string
          ordem?: number
          preco_centavos?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tenant_id?: string
          updated_at?: string
          vertical?: Database["public"]["Enums"]["tenant_vertical"]
        }
        Relationships: [
          {
            foreignKeyName: "planos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      profissionais: {
        Row: {
          bio: string | null
          created_at: string
          especialidade: string | null
          foto_identidade_url: string | null
          id: string
          nome: string
          status_identidade: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          especialidade?: string | null
          foto_identidade_url?: string | null
          id: string
          nome: string
          status_identidade?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          especialidade?: string | null
          foto_identidade_url?: string | null
          id?: string
          nome?: string
          status_identidade?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissionais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      prs: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          exercicio: string
          id: string
          tenant_id: string
          unidade: string | null
          valor: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data?: string
          exercicio: string
          id?: string
          tenant_id: string
          unidade?: string | null
          valor: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          exercicio?: string
          id?: string
          tenant_id?: string
          unidade?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "prs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      push_send_logs: {
        Row: {
          body: string | null
          created_at: string
          error_message: string | null
          fcm_response: Json | null
          has_token: boolean
          id: string
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          error_message?: string | null
          fcm_response?: Json | null
          has_token?: boolean
          id?: string
          status: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          error_message?: string | null
          fcm_response?: Json | null
          has_token?: boolean
          id?: string
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      refeicoes: {
        Row: {
          descricao_ia: string | null
          dieta_id: string | null
          horario: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          descricao_ia?: string | null
          dieta_id?: string | null
          horario?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          descricao_ia?: string | null
          dieta_id?: string | null
          horario?: string | null
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "refeicoes_dieta_id_fkey"
            columns: ["dieta_id"]
            isOneToOne: false
            referencedRelation: "dietas"
            referencedColumns: ["id"]
          },
        ]
      }
      referencia_exercicios: {
        Row: {
          created_at: string | null
          grupamento_muscular: string | null
          id: string
          nome_exercicio: string
          origem: string
          profissional_id: string | null
          storage_path: string | null
          tenant_id: string | null
          thumbnail_url: string | null
          url_video: string | null
        }
        Insert: {
          created_at?: string | null
          grupamento_muscular?: string | null
          id?: string
          nome_exercicio: string
          origem?: string
          profissional_id?: string | null
          storage_path?: string | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          url_video?: string | null
        }
        Update: {
          created_at?: string | null
          grupamento_muscular?: string | null
          id?: string
          nome_exercicio?: string
          origem?: string
          profissional_id?: string | null
          storage_path?: string | null
          tenant_id?: string | null
          thumbnail_url?: string | null
          url_video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referencia_exercicios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencia_exercicios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      referencia_videos: {
        Row: {
          created_at: string
          id: string
          nome_exercicio: string
          tenant_id: string
          updated_at: string
          url_video: string
          video_coach_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome_exercicio: string
          tenant_id: string
          updated_at?: string
          url_video: string
          video_coach_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          nome_exercicio?: string
          tenant_id?: string
          updated_at?: string
          url_video?: string
          video_coach_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referencia_videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referencia_videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      referencias_exames: {
        Row: {
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          importancia: string | null
          nome: string
          unidade: string | null
          valor_maximo: number | null
          valor_minimo: number | null
          valor_ouro_max: number | null
          valor_ouro_min: number | null
        }
        Insert: {
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          importancia?: string | null
          nome: string
          unidade?: string | null
          valor_maximo?: number | null
          valor_minimo?: number | null
          valor_ouro_max?: number | null
          valor_ouro_min?: number | null
        }
        Update: {
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          importancia?: string | null
          nome?: string
          unidade?: string | null
          valor_maximo?: number | null
          valor_minimo?: number | null
          valor_ouro_max?: number | null
          valor_ouro_min?: number | null
        }
        Relationships: []
      }
      regras_descanso_pacho: {
        Row: {
          cardio_instrução: string | null
          dias_descanso_sugeridos: string | null
          logica_descanso: string | null
          nivel: string
        }
        Insert: {
          cardio_instrução?: string | null
          dias_descanso_sugeridos?: string | null
          logica_descanso?: string | null
          nivel: string
        }
        Update: {
          cardio_instrução?: string | null
          dias_descanso_sugeridos?: string | null
          logica_descanso?: string | null
          nivel?: string
        }
        Relationships: []
      }
      regras_volume_pacho: {
        Row: {
          min_exercicios_grandes: number | null
          min_exercicios_ombro: number | null
          min_exercicios_pequenos: number | null
          nivel: string
          usa_tecnicas_avancadas: boolean | null
        }
        Insert: {
          min_exercicios_grandes?: number | null
          min_exercicios_ombro?: number | null
          min_exercicios_pequenos?: number | null
          nivel: string
          usa_tecnicas_avancadas?: boolean | null
        }
        Update: {
          min_exercicios_grandes?: number | null
          min_exercicios_ombro?: number | null
          min_exercicios_pequenos?: number | null
          nivel?: string
          usa_tecnicas_avancadas?: boolean | null
        }
        Relationships: []
      }
      saques: {
        Row: {
          chave_pix: string
          created_at: string
          id: string
          profissional_id: string
          status: string
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          chave_pix: string
          created_at?: string
          id?: string
          profissional_id: string
          status?: string
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          chave_pix?: string
          created_at?: string
          id?: string
          profissional_id?: string
          status?: string
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "saques_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_luta: {
        Row: {
          aluno_id: string
          camp_id: string | null
          created_at: string
          data: string
          descricao: string | null
          duracao_min: number | null
          id: string
          intensidade: string | null
          rpe: number | null
          tenant_id: string
          tipo: string | null
        }
        Insert: {
          aluno_id: string
          camp_id?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          intensidade?: string | null
          rpe?: number | null
          tenant_id: string
          tipo?: string | null
        }
        Update: {
          aluno_id?: string
          camp_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          intensidade?: string | null
          rpe?: number | null
          tenant_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_luta_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps_luta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_luta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_luta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      templates_treino: {
        Row: {
          ativo: boolean
          codigo: string
          conteudo_completo: string | null
          created_at: string
          created_by: string | null
          divisao: string | null
          enfase: string | null
          fonte_arquivo: string
          frequencia_semanal: number | null
          id: string
          nivel: string
          objetivo: string | null
          publico: string
          resumo: string | null
          tags: string[] | null
          tenant_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          conteudo_completo?: string | null
          created_at?: string
          created_by?: string | null
          divisao?: string | null
          enfase?: string | null
          fonte_arquivo: string
          frequencia_semanal?: number | null
          id?: string
          nivel?: string
          objetivo?: string | null
          publico?: string
          resumo?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          conteudo_completo?: string | null
          created_at?: string
          created_by?: string | null
          divisao?: string | null
          enfase?: string | null
          fonte_arquivo?: string
          frequencia_semanal?: number | null
          id?: string
          nivel?: string
          objetivo?: string | null
          publico?: string
          resumo?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          accent_hsl: string
          app_preview_url: string | null
          bio: string | null
          cidade: string | null
          created_at: string
          especialidades: string[] | null
          estado: string | null
          foto_url: string | null
          free_access: boolean
          hero_url: string | null
          id: string
          is_partner: boolean
          login_video_url: string | null
          logo_url: string | null
          music_url: string | null
          nome: string
          owner_user_id: string | null
          permite_aula_avulsa: boolean | null
          preco_aula_avulsa: number | null
          primary_hsl: string
          slug: string
          splash_video_url: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          symbol_url: string | null
          tagline: string | null
          theme_overrides: Json
          updated_at: string
          vertical: Database["public"]["Enums"]["tenant_vertical"]
        }
        Insert: {
          accent_hsl?: string
          app_preview_url?: string | null
          bio?: string | null
          cidade?: string | null
          created_at?: string
          especialidades?: string[] | null
          estado?: string | null
          foto_url?: string | null
          free_access?: boolean
          hero_url?: string | null
          id?: string
          is_partner?: boolean
          login_video_url?: string | null
          logo_url?: string | null
          music_url?: string | null
          nome: string
          owner_user_id?: string | null
          permite_aula_avulsa?: boolean | null
          preco_aula_avulsa?: number | null
          primary_hsl?: string
          slug: string
          splash_video_url?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          symbol_url?: string | null
          tagline?: string | null
          theme_overrides?: Json
          updated_at?: string
          vertical?: Database["public"]["Enums"]["tenant_vertical"]
        }
        Update: {
          accent_hsl?: string
          app_preview_url?: string | null
          bio?: string | null
          cidade?: string | null
          created_at?: string
          especialidades?: string[] | null
          estado?: string | null
          foto_url?: string | null
          free_access?: boolean
          hero_url?: string | null
          id?: string
          is_partner?: boolean
          login_video_url?: string | null
          logo_url?: string | null
          music_url?: string | null
          nome?: string
          owner_user_id?: string | null
          permite_aula_avulsa?: boolean | null
          preco_aula_avulsa?: number | null
          primary_hsl?: string
          slug?: string
          splash_video_url?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          symbol_url?: string | null
          tagline?: string | null
          theme_overrides?: Json
          updated_at?: string
          vertical?: Database["public"]["Enums"]["tenant_vertical"]
        }
        Relationships: []
      }
      tenants_private: {
        Row: {
          asaas_wallet_id: string | null
          created_at: string
          instagram_access_token: string | null
          instagram_business_account_id: string | null
          instagram_token_expires_at: string | null
          mcp_token: string
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean | null
          tenant_id: string
          updated_at: string
          vlog_webhook_secret: string | null
        }
        Insert: {
          asaas_wallet_id?: string | null
          created_at?: string
          instagram_access_token?: string | null
          instagram_business_account_id?: string | null
          instagram_token_expires_at?: string | null
          mcp_token?: string
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          tenant_id: string
          updated_at?: string
          vlog_webhook_secret?: string | null
        }
        Update: {
          asaas_wallet_id?: string | null
          created_at?: string
          instagram_access_token?: string | null
          instagram_business_account_id?: string | null
          instagram_token_expires_at?: string | null
          mcp_token?: string
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean | null
          tenant_id?: string
          updated_at?: string
          vlog_webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_private_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_private_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      treinos_prescritos: {
        Row: {
          aluno_id: string
          cadencia: string | null
          created_at: string
          detalhes_execucao: string | null
          dia_semana: string
          exercicio: string
          id: string
          observacao: string | null
          ordem: number | null
          ordem_execucao: number | null
          repeticoes: string | null
          series: string | null
          status: string | null
          tecnica_id: string | null
          técnica_intensificacao: string | null
          tenant_id: string
          tipo_serie_pacho: string | null
          updated_at: string
          video_coach_url: string | null
          video_url: string | null
        }
        Insert: {
          aluno_id: string
          cadencia?: string | null
          created_at?: string
          detalhes_execucao?: string | null
          dia_semana: string
          exercicio: string
          id?: string
          observacao?: string | null
          ordem?: number | null
          ordem_execucao?: number | null
          repeticoes?: string | null
          series?: string | null
          status?: string | null
          tecnica_id?: string | null
          técnica_intensificacao?: string | null
          tenant_id: string
          tipo_serie_pacho?: string | null
          updated_at?: string
          video_coach_url?: string | null
          video_url?: string | null
        }
        Update: {
          aluno_id?: string
          cadencia?: string | null
          created_at?: string
          detalhes_execucao?: string | null
          dia_semana?: string
          exercicio?: string
          id?: string
          observacao?: string | null
          ordem?: number | null
          ordem_execucao?: number | null
          repeticoes?: string | null
          series?: string | null
          status?: string | null
          tecnica_id?: string | null
          técnica_intensificacao?: string | null
          tenant_id?: string
          tipo_serie_pacho?: string | null
          updated_at?: string
          video_coach_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinos_prescritos_tecnica_id_fkey"
            columns: ["tecnica_id"]
            isOneToOne: false
            referencedRelation: "dicionario_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_prescritos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinos_prescritos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      vlog_posts: {
        Row: {
          author: string | null
          created_at: string
          description: string | null
          destaque: boolean
          external_id: string | null
          id: string
          ordem: number
          platform: Database["public"]["Enums"]["vlog_platform"]
          posted_at: string | null
          source: string
          tenant_id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          url: string
          visivel: boolean
        }
        Insert: {
          author?: string | null
          created_at?: string
          description?: string | null
          destaque?: boolean
          external_id?: string | null
          id?: string
          ordem?: number
          platform?: Database["public"]["Enums"]["vlog_platform"]
          posted_at?: string | null
          source?: string
          tenant_id: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url: string
          visivel?: boolean
        }
        Update: {
          author?: string | null
          created_at?: string
          description?: string | null
          destaque?: boolean
          external_id?: string | null
          id?: string
          ordem?: number
          platform?: Database["public"]["Enums"]["vlog_platform"]
          posted_at?: string | null
          source?: string
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vlog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          plano_id: string
          tenant_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plano_id: string
          tenant_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plano_id?: string
          tenant_id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      wod_resultados: {
        Row: {
          aluno_id: string
          categoria: string | null
          created_at: string
          id: string
          observacoes: string | null
          resultado: string | null
          tenant_id: string
          wod_id: string
        }
        Insert: {
          aluno_id: string
          categoria?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          resultado?: string | null
          tenant_id: string
          wod_id: string
        }
        Update: {
          aluno_id?: string
          categoria?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          resultado?: string | null
          tenant_id?: string
          wod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wod_resultados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_resultados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "wod_resultados_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
            referencedColumns: ["id"]
          },
        ]
      }
      wods: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descricao: string | null
          duracao_min: number | null
          id: string
          nome: string | null
          tenant_id: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          nome?: string | null
          tenant_id: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          nome?: string | null
          tenant_id?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_coach_dashboard_kpis"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
    }
    Views: {
      v_coach_dashboard_kpis: {
        Row: {
          alunos_ativos: number | null
          alunos_inativos: number | null
          faturamento_mes_liquido: number | null
          proximo_pagamento: string | null
          slug: string | null
          tenant_id: string | null
        }
        Insert: {
          alunos_ativos?: never
          alunos_inativos?: never
          faturamento_mes_liquido?: never
          proximo_pagamento?: never
          slug?: string | null
          tenant_id?: string | null
        }
        Update: {
          alunos_ativos?: never
          alunos_inativos?: never
          faturamento_mes_liquido?: never
          proximo_pagamento?: never
          slug?: string | null
          tenant_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buscar_templates_treino: {
        Args: {
          p_divisao?: string
          p_enfase?: string
          p_frequencia?: number
          p_limit?: number
          p_nivel?: string
          p_publico?: string
          p_tenant_id?: string
        }
        Returns: {
          codigo: string
          conteudo_completo: string
          divisao: string
          enfase: string
          fonte_arquivo: string
          frequencia_semanal: number
          id: string
          nivel: string
          publico: string
          resumo: string
          score: number
          titulo: string
        }[]
      }
      can_manage_athlete_avatar: {
        Args: { _athlete_id: string; _caller: string }
        Returns: boolean
      }
      check_and_send_reminders: { Args: never; Returns: undefined }
      complete_student_onboarding: {
        Args: {
          _anamnese: Json
          _avaliacao: Json
          _data_nascimento: string
          _nome_completo: string
          _sexo: string
          _telefone: string
          _tenant_id: string
        }
        Returns: Json
      }
      current_user_tenant: { Args: never; Returns: string }
      email_is_registered: { Args: { _email: string }; Returns: boolean }
      get_community_members: {
        Args: { _tenant_id: string }
        Returns: {
          avatar_url: string
          id: string
          nome_completo: string
        }[]
      }
      get_my_mcp_token: { Args: never; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_active_subscription_for_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      redeem_delivery_lookup: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          diet_id: string
          id: string
          is_active: boolean
          plan_id: string
          template_resumo: string
          template_titulo: string
          token: string
          user_id: string
        }[]
      }
      redeem_voucher: { Args: { _code: string }; Returns: Json }
      rotate_my_mcp_token: { Args: never; Returns: string }
      send_push_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_belongs_to_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "aluno"
      assinatura_status:
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete"
        | "unpaid"
      coach_plan_tier: "standard" | "premium" | "pro"
      coach_sub_status:
        | "pending"
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
      fight_nutrition_fase: "off_season" | "pre_camp" | "weight_cut"
      plano_intervalo: "mensal" | "trimestral" | "anual" | "semestral"
      tenant_status: "pending" | "approved" | "rejected" | "suspended"
      tenant_vertical: "personal" | "crossfit" | "fight"
      vlog_platform: "youtube" | "instagram" | "tiktok" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "coach", "aluno"],
      assinatura_status: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "incomplete",
        "unpaid",
      ],
      coach_plan_tier: ["standard", "premium", "pro"],
      coach_sub_status: [
        "pending",
        "trialing",
        "active",
        "past_due",
        "canceled",
      ],
      fight_nutrition_fase: ["off_season", "pre_camp", "weight_cut"],
      plano_intervalo: ["mensal", "trimestral", "anual", "semestral"],
      tenant_status: ["pending", "approved", "rejected", "suspended"],
      tenant_vertical: ["personal", "crossfit", "fight"],
      vlog_platform: ["youtube", "instagram", "tiktok", "other"],
    },
  },
} as const
