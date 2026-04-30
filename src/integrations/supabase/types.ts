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
        ]
      }
      anamnese_aluno: {
        Row: {
          agua_litros: number | null
          alcool: string | null
          alimentos_ama: string | null
          alimentos_evita: string | null
          aluno_id: string
          anos_treino: number | null
          cirurgias: string | null
          created_at: string
          disponibilidade_dias: string[] | null
          doencas: string[] | null
          historico_familiar: string | null
          horas_sono: number | null
          id: string
          lesoes_atuais: string | null
          medicamentos: string | null
          modalidades_anteriores: string[] | null
          nivel_estresse: number | null
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
          alimentos_evita?: string | null
          aluno_id: string
          anos_treino?: number | null
          cirurgias?: string | null
          created_at?: string
          disponibilidade_dias?: string[] | null
          doencas?: string[] | null
          historico_familiar?: string | null
          horas_sono?: number | null
          id?: string
          lesoes_atuais?: string | null
          medicamentos?: string | null
          modalidades_anteriores?: string[] | null
          nivel_estresse?: number | null
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
          alimentos_evita?: string | null
          aluno_id?: string
          anos_treino?: number | null
          cirurgias?: string | null
          created_at?: string
          disponibilidade_dias?: string[] | null
          doencas?: string[] | null
          historico_familiar?: string | null
          horas_sono?: number | null
          id?: string
          lesoes_atuais?: string | null
          medicamentos?: string | null
          modalidades_anteriores?: string[] | null
          nivel_estresse?: number | null
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
        ]
      }
      assinaturas: {
        Row: {
          aluno_id: string
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
          foto_costas_url: string | null
          foto_frente_url: string | null
          foto_lado_url: string | null
          id: string
          imc: number | null
          massa_gorda_kg: number | null
          massa_magra_kg: number | null
          observacoes: string | null
          pescoco_cm: number | null
          peso_kg: number
          quadril_cm: number | null
          tenant_id: string | null
        }
        Insert: {
          altura_cm: number
          aluno_id: string
          bf_pct_calculado?: number | null
          cintura_cm?: number | null
          created_at?: string
          data?: string
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          id?: string
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          pescoco_cm?: number | null
          peso_kg: number
          quadril_cm?: number | null
          tenant_id?: string | null
        }
        Update: {
          altura_cm?: number
          aluno_id?: string
          bf_pct_calculado?: number | null
          cintura_cm?: number | null
          created_at?: string
          data?: string
          foto_costas_url?: string | null
          foto_frente_url?: string | null
          foto_lado_url?: string | null
          id?: string
          imc?: number | null
          massa_gorda_kg?: number | null
          massa_magra_kg?: number | null
          observacoes?: string | null
          pescoco_cm?: number | null
          peso_kg?: number
          quadril_cm?: number | null
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
        ]
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
        ]
      }
      biblioteca_metodologia_pacho: {
        Row: {
          created_at: string
          descricao_metodologia: string | null
          grupo_muscular: string
          id: string
          nome_exercicio: string
          profissional_id: string
          tags: string[] | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          descricao_metodologia?: string | null
          grupo_muscular: string
          id?: string
          nome_exercicio: string
          profissional_id: string
          tags?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          descricao_metodologia?: string | null
          grupo_muscular?: string
          id?: string
          nome_exercicio?: string
          profissional_id?: string
          tags?: string[] | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biblioteca_metodologia_pacho_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
          user_id: string
        }
        Insert: {
          carga_kg?: number
          created_at?: string
          data_treino?: string
          exercicio_nome: string
          id?: string
          repeticoes_feitas?: number
          tenant_id: string
          user_id: string
        }
        Update: {
          carga_kg?: number
          created_at?: string
          data_treino?: string
          exercicio_nome?: string
          id?: string
          repeticoes_feitas?: number
          tenant_id?: string
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
      perfis: {
        Row: {
          avatar_url: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          id: string
          nome_completo: string | null
          onboarding_completo: boolean
          sexo: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id: string
          nome_completo?: string | null
          onboarding_completo?: boolean
          sexo?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome_completo?: string | null
          onboarding_completo?: boolean
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
        ]
      }
      perfis_treino: {
        Row: {
          altura_cm: number | null
          aluno_id: string
          bf_pct: number | null
          created_at: string
          frequencia_semanal: number | null
          id: string
          idade: number | null
          lesoes: string[] | null
          limitacoes: string[] | null
          objetivo: string | null
          peso_kg: number | null
          sexo: string | null
          tempo_treino: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          altura_cm?: number | null
          aluno_id: string
          bf_pct?: number | null
          created_at?: string
          frequencia_semanal?: number | null
          id?: string
          idade?: number | null
          lesoes?: string[] | null
          limitacoes?: string[] | null
          objetivo?: string | null
          peso_kg?: number | null
          sexo?: string | null
          tempo_treino?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          altura_cm?: number | null
          aluno_id?: string
          bf_pct?: number | null
          created_at?: string
          frequencia_semanal?: number | null
          id?: string
          idade?: number | null
          lesoes?: string[] | null
          limitacoes?: string[] | null
          objetivo?: string | null
          peso_kg?: number | null
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
        ]
      }
      planos: {
        Row: {
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
        }
        Insert: {
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
        }
        Update: {
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
        }
        Relationships: [
          {
            foreignKeyName: "planos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          bio: string | null
          created_at: string
          especialidade: string | null
          id: string
          nome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          especialidade?: string | null
          id: string
          nome: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          especialidade?: string | null
          id?: string
          nome?: string
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
        ]
      }
      tenants: {
        Row: {
          accent_hsl: string
          bio: string | null
          created_at: string
          especialidades: string[] | null
          foto_url: string | null
          hero_url: string | null
          id: string
          logo_url: string | null
          nome: string
          owner_user_id: string | null
          primary_hsl: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          stripe_account_id: string | null
          stripe_onboarding_completed: boolean
          symbol_url: string | null
          tagline: string | null
          theme_overrides: Json
          updated_at: string
          vlog_webhook_secret: string
        }
        Insert: {
          accent_hsl?: string
          bio?: string | null
          created_at?: string
          especialidades?: string[] | null
          foto_url?: string | null
          hero_url?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          owner_user_id?: string | null
          primary_hsl?: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean
          symbol_url?: string | null
          tagline?: string | null
          theme_overrides?: Json
          updated_at?: string
          vlog_webhook_secret?: string
        }
        Update: {
          accent_hsl?: string
          bio?: string | null
          created_at?: string
          especialidades?: string[] | null
          foto_url?: string | null
          hero_url?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          owner_user_id?: string | null
          primary_hsl?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_account_id?: string | null
          stripe_onboarding_completed?: boolean
          symbol_url?: string | null
          tagline?: string | null
          theme_overrides?: Json
          updated_at?: string
          vlog_webhook_secret?: string
        }
        Relationships: []
      }
      treinos_prescritos: {
        Row: {
          aluno_id: string
          created_at: string
          dia_semana: string
          exercicio: string
          id: string
          observacao: string | null
          ordem: number | null
          repeticoes: string | null
          series: string | null
          tenant_id: string
          updated_at: string
          video_coach_url: string | null
          video_url: string | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          dia_semana: string
          exercicio: string
          id?: string
          observacao?: string | null
          ordem?: number | null
          repeticoes?: string | null
          series?: string | null
          tenant_id: string
          updated_at?: string
          video_coach_url?: string | null
          video_url?: string | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          dia_semana?: string
          exercicio?: string
          id?: string
          observacao?: string | null
          ordem?: number | null
          repeticoes?: string | null
          series?: string | null
          tenant_id?: string
          updated_at?: string
          video_coach_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treinos_prescritos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
        ]
      }
      vlog_posts: {
        Row: {
          author: string | null
          created_at: string
          description: string | null
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_tenant: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id?: string
          _user_id: string
        }
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
      plano_intervalo: "mensal" | "trimestral" | "anual"
      tenant_status: "pending" | "approved" | "rejected" | "suspended"
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
      plano_intervalo: ["mensal", "trimestral", "anual"],
      tenant_status: ["pending", "approved", "rejected", "suspended"],
      vlog_platform: ["youtube", "instagram", "tiktok", "other"],
    },
  },
} as const
