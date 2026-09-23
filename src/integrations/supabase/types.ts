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
      external_rewards: {
        Row: {
          created_at: string
          id: string
          processed_at: string
          provider: string
          taxa_conversao: number
          transaction_id: string
          updated_at: string
          user_id: string
          valor_creditado: number
          valor_origem: number
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string
          provider: string
          taxa_conversao: number
          transaction_id: string
          updated_at?: string
          user_id: string
          valor_creditado: number
          valor_origem: number
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string
          provider?: string
          taxa_conversao?: number
          transaction_id?: string
          updated_at?: string
          user_id?: string
          valor_creditado?: number
          valor_origem?: number
        }
        Relationships: [
          {
            foreignKeyName: "external_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licenca_pedidos: {
        Row: {
          created_at: string
          id: string
          payment_id: string
          plano: string
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          payment_id: string
          plano?: string
          status?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          payment_id?: string
          plano?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      payouts: {
        Row: {
          created_at: string
          id: string
          pix_chave: string
          pix_tipo: string
          status: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          pix_chave?: string
          pix_tipo?: string
          status?: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          pix_chave?: string
          pix_tipo?: string
          status?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          data_assinatura: string | null
          id: string
          nome: string
          nome_completo: string
          pix_key: string | null
          plano: string
          saldo: number
          selfie_url: string | null
          status_licenca: string
          termos_aceitos: boolean
          validade_licenca: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          data_assinatura?: string | null
          id: string
          nome?: string
          nome_completo?: string
          pix_key?: string | null
          plano?: string
          saldo?: number
          selfie_url?: string | null
          status_licenca?: string
          termos_aceitos?: boolean
          validade_licenca?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          data_assinatura?: string | null
          id?: string
          nome?: string
          nome_completo?: string
          pix_key?: string | null
          plano?: string
          saldo?: number
          selfie_url?: string | null
          status_licenca?: string
          termos_aceitos?: boolean
          validade_licenca?: string | null
        }
        Relationships: []
      }
      robo_execucoes: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "robo_execucoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          comentario: string
          created_at: string
          experiencia: string
          foto_url: string | null
          id: string
          reviewed_at: string | null
          status: string
          task_id: string
          user_id: string
          valor: number
        }
        Insert: {
          comentario?: string
          created_at?: string
          experiencia: string
          foto_url?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string
          task_id: string
          user_id: string
          valor: number
        }
        Update: {
          comentario?: string
          created_at?: string
          experiencia?: string
          foto_url?: string | null
          id?: string
          reviewed_at?: string | null
          status?: string
          task_id?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string
          empresa: string
          id: string
          local: string
          prazo: string
          tempo_estimado: string
          titulo: string
          valor: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          empresa: string
          id?: string
          local?: string
          prazo?: string
          tempo_estimado?: string
          titulo: string
          valor: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          empresa?: string
          id?: string
          local?: string
          prazo?: string
          tempo_estimado?: string
          titulo?: string
          valor?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          descricao: string
          id: string
          tarefa_id: string | null
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          tarefa_id?: string | null
          tipo?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          tarefa_id?: string | null
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          id: string
          saldo_atual: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          saldo_atual?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          saldo_atual?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_resgates: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          nome: string
          pix_chave: string
          pix_tipo: string
          status: string
          user_id: string
          valor: number
        }[]
      }
      admin_usuarios: {
        Args: never
        Returns: {
          criado_em: string
          email: string
          nome: string
          saldo: number
          status_licenca: string
          user_id: string
          validade_licenca: string
        }[]
      }
      admin_visao_geral: {
        Args: never
        Returns: {
          licencas_ativas: number
          lucro_estimado: number
          saldo_total: number
          saques_pendentes: number
          total_usuarios: number
        }[]
      }
      aplicar_licenca_vitalicia: {
        Args: never
        Returns: {
          cpf: string | null
          created_at: string
          data_assinatura: string | null
          id: string
          nome: string
          nome_completo: string
          pix_key: string | null
          plano: string
          saldo: number
          selfie_url: string | null
          status_licenca: string
          termos_aceitos: boolean
          validade_licenca: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ativar_licenca: {
        Args: never
        Returns: {
          cpf: string | null
          created_at: string
          data_assinatura: string | null
          id: string
          nome: string
          nome_completo: string
          pix_key: string | null
          plano: string
          saldo: number
          selfie_url: string | null
          status_licenca: string
          termos_aceitos: boolean
          validade_licenca: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirmar_pagamento_licenca: {
        Args: { _payment_id: string }
        Returns: string
      }
      creditar_recompensa: {
        Args: { _tarefa_id: string; _user_id: string; _valor: number }
        Returns: number
      }
      creditar_recompensa_externa: {
        Args: {
          _provider: string
          _taxa_conversao: number
          _transaction_id: string
          _user_id: string
          _valor_creditado: number
          _valor_origem: number
        }
        Returns: {
          creditado: boolean
          saldo_atual: number
        }[]
      }
      email_licenca_vitalicia: { Args: { _email: string }; Returns: boolean }
      executar_robo_ia: {
        Args: never
        Returns: {
          limite: number
          permitido: boolean
          usadas: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      limite_plano: { Args: { _plano: string }; Returns: number }
      revisar_envio: {
        Args: { _aprovar: boolean; _submission_id: string }
        Returns: undefined
      }
      revisar_resgate: {
        Args: { _aprovar: boolean; _payout_id: string }
        Returns: undefined
      }
      solicitar_resgate: {
        Args: { _pix_chave: string; _pix_tipo: string; _valor: number }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
