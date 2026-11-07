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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          end_time: string
          id: string
          notes: string | null
          patient_id: string
          service_type: string | null
          start_time: string
          status: string
          therapist_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          patient_id: string
          service_type?: string | null
          start_time: string
          status?: string
          therapist_id?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string
          service_type?: string | null
          start_time?: string
          status?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          anamnesis: string | null
          created_at: string
          id: string
          patient_id: string
          session_notes: string | null
          therapist_id: string
          treatment_plan: string | null
        }
        Insert: {
          anamnesis?: string | null
          created_at?: string
          id?: string
          patient_id: string
          session_notes?: string | null
          therapist_id?: string
          treatment_plan?: string | null
        }
        Update: {
          anamnesis?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          session_notes?: string | null
          therapist_id?: string
          treatment_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          last_number: number
          therapist_id: string
          year: number
        }
        Insert: {
          last_number?: number
          therapist_id: string
          year: number
        }
        Update: {
          last_number?: number
          therapist_id?: string
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cash_cents: number
          created_at: string
          id: string
          invoice_number: string
          issued_at: string
          patient_id: string
          pos_cents: number
          stamp_duty_due: boolean
          therapist_id: string
          total_cents: number
        }
        Insert: {
          cash_cents: number
          created_at?: string
          id?: string
          invoice_number: string
          issued_at?: string
          patient_id: string
          pos_cents: number
          stamp_duty_due?: boolean
          therapist_id: string
          total_cents: number
        }
        Update: {
          cash_cents?: number
          created_at?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          patient_id?: string
          pos_cents?: number
          stamp_duty_due?: boolean
          therapist_id?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_events: {
        Row: {
          id: string
          patient_id: string
          sent_at: string
          therapist_id: string
          type: string
        }
        Insert: {
          id?: string
          patient_id: string
          sent_at?: string
          therapist_id?: string
          type: string
        }
        Update: {
          id?: string
          patient_id?: string
          sent_at?: string
          therapist_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          consent_date: string | null
          consent_marketing: boolean
          consent_marketing_date: string | null
          consent_privacy: boolean
          consent_text_version: string | null
          created_at: string
          email: string | null
          first_name: string
          fiscal_code: string | null
          id: string
          last_name: string
          phone: string | null
          referred_by_code: string | null
          signature_path: string | null
          tags: string[]
          therapist_id: string
        }
        Insert: {
          consent_date?: string | null
          consent_marketing?: boolean
          consent_marketing_date?: string | null
          consent_privacy?: boolean
          consent_text_version?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          fiscal_code?: string | null
          id?: string
          last_name: string
          phone?: string | null
          referred_by_code?: string | null
          signature_path?: string | null
          tags?: string[]
          therapist_id?: string
        }
        Update: {
          consent_date?: string | null
          consent_marketing?: boolean
          consent_marketing_date?: string | null
          consent_privacy?: boolean
          consent_text_version?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          fiscal_code?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          referred_by_code?: string | null
          signature_path?: string | null
          tags?: string[]
          therapist_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          patient_id: string
          therapist_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          patient_id: string
          therapist_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          patient_id?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_profiles: {
        Row: {
          created_at: string
          fiscal_code: string | null
          full_name: string | null
          google_review_url: string | null
          id: string
          studio_name: string | null
          vat_number: string | null
        }
        Insert: {
          created_at?: string
          fiscal_code?: string | null
          full_name?: string | null
          google_review_url?: string | null
          id?: string
          studio_name?: string | null
          vat_number?: string | null
        }
        Update: {
          created_at?: string
          fiscal_code?: string | null
          full_name?: string | null
          google_review_url?: string | null
          id?: string
          studio_name?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      issue_invoice: {
        Args: {
          p_cash_cents: number
          p_patient_id: string
          p_pos_cents: number
          p_total_cents: number
        }
        Returns: {
          cash_cents: number
          created_at: string
          id: string
          invoice_number: string
          issued_at: string
          patient_id: string
          pos_cents: number
          stamp_duty_due: boolean
          therapist_id: string
          total_cents: number
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owns_patient: { Args: { pid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
