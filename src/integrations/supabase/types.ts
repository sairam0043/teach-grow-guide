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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      class_bookings: {
        Row: {
          created_at: string
          id: string
          price: number
          schedule: Json
          status: string
          student_id: string
          tutor_id: string
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          schedule?: Json
          status?: string
          student_id: string
          tutor_id: string
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          schedule?: Json
          status?: string
          student_id?: string
          tutor_id?: string
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_bookings: {
        Row: {
          created_at: string
          id: string
          status: string
          student_confirmed: boolean | null
          student_id: string
          time_slot: string
          tutor_confirmed: boolean | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          student_confirmed?: boolean | null
          student_id: string
          time_slot: string
          tutor_confirmed?: boolean | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          student_confirmed?: boolean | null
          student_id?: string
          time_slot?: string
          tutor_confirmed?: boolean | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          class_booking_id: string | null
          created_at: string
          id: string
          razorpay_payment_id: string | null
          status: string
          student_id: string
          tutor_id: string
        }
        Insert: {
          amount: number
          class_booking_id?: string | null
          created_at?: string
          id?: string
          razorpay_payment_id?: string | null
          status?: string
          student_id: string
          tutor_id: string
        }
        Update: {
          amount?: number
          class_booking_id?: string | null
          created_at?: string
          id?: string
          razorpay_payment_id?: string | null
          status?: string
          student_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_class_booking_id_fkey"
            columns: ["class_booking_id"]
            isOneToOne: false
            referencedRelation: "class_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string
          id: string
          label: string
          max_students: number
          min_students: number
          rate_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          max_students?: number
          min_students?: number
          rate_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          max_students?: number
          min_students?: number
          rate_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          interests: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          interests?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          interests?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutors: {
        Row: {
          approval_status: string
          bio: string | null
          category: string
          city: string | null
          created_at: string
          demo_availability: Json | null
          experience: number
          hourly_rate: number | null
          id: string
          qualification: string | null
          subjects: string[]
          teaching_mode: string
          updated_at: string
          user_id: string
          weekly_availability: Json | null
        }
        Insert: {
          approval_status?: string
          bio?: string | null
          category: string
          city?: string | null
          created_at?: string
          demo_availability?: Json | null
          experience?: number
          hourly_rate?: number | null
          id?: string
          qualification?: string | null
          subjects?: string[]
          teaching_mode?: string
          updated_at?: string
          user_id: string
          weekly_availability?: Json | null
        }
        Update: {
          approval_status?: string
          bio?: string | null
          category?: string
          city?: string | null
          created_at?: string
          demo_availability?: Json | null
          experience?: number
          hourly_rate?: number | null
          id?: string
          qualification?: string | null
          subjects?: string[]
          teaching_mode?: string
          updated_at?: string
          user_id?: string
          weekly_availability?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_demo_booking: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student" | "tutor"
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
      app_role: ["admin", "moderator", "student", "tutor"],
    },
  },
} as const
