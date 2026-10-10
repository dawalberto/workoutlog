
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "active_session_completed_sets": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"routine_id": string,"server_revision": number,"server_updated_at": string,"set_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"routine_id": string,"server_revision"?: number,"server_updated_at"?: string,"set_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"routine_id"?: string,"server_revision"?: number,"server_updated_at"?: string,"set_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "active_session_completed_sets_user_id_routine_id_fkey"
      columns: ["user_id","routine_id"]
isOneToOne: false
      referencedRelation: "active_workout_sessions"
      referencedColumns: ["user_id","routine_id"]
    },{
      foreignKeyName: "active_session_completed_sets_user_id_routine_id_set_id_fkey"
      columns: ["user_id","routine_id","set_id"]
isOneToOne: true
      referencedRelation: "workout_sets"
      referencedColumns: ["user_id","routine_id","id"]
    }
                  ]
                },"active_workout_sessions": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"routine_id": string,"server_revision": number,"server_updated_at": string,"started_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"routine_id": string,"server_revision"?: number,"server_updated_at"?: string,"started_at": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"routine_id"?: string,"server_revision"?: number,"server_updated_at"?: string,"started_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "active_workout_sessions_user_id_routine_id_fkey"
      columns: ["user_id","routine_id"]
isOneToOne: true
      referencedRelation: "routines"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"exercise_definitions": {
                  Row: {
                    "category": string | null,"created_at": string,"default_reps": Json | null,"default_rest_seconds": Json | null,"default_sets": Json | null,"default_weight": Json | null,"deleted_at": string | null,"id": string,"image_url": string | null,"name": string,"notes": string | null,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"default_reps"?: Json | null,"default_rest_seconds"?: Json | null,"default_sets"?: Json | null,"default_weight"?: Json | null,"deleted_at"?: string | null,"id": string,"image_url"?: string | null,"name": string,"notes"?: string | null,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string,"video_url"?: string | null
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"default_reps"?: Json | null,"default_rest_seconds"?: Json | null,"default_sets"?: Json | null,"default_weight"?: Json | null,"deleted_at"?: string | null,"id"?: string,"image_url"?: string | null,"name"?: string,"notes"?: string | null,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string,"video_url"?: string | null
                  }
                  Relationships: [

                  ]
                },"exercise_diaries": {
                  Row: {
                    "category": string | null,"created_at": string,"definition_id": string | null,"deleted_at": string | null,"exercise_name": string,"id": string,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"definition_id"?: string | null,"deleted_at"?: string | null,"exercise_name": string,"id": string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"definition_id"?: string | null,"deleted_at"?: string | null,"exercise_name"?: string,"id"?: string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_diaries_user_id_definition_id_fkey"
      columns: ["user_id","definition_id"]
isOneToOne: false
      referencedRelation: "exercise_definitions"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"exercise_diary_entries": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"diary_id": string,"feeling": string | null,"id": string,"note": string,"recorded_on": string,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"diary_id": string,"feeling"?: string | null,"id": string,"note": string,"recorded_on": string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"diary_id"?: string,"feeling"?: string | null,"id"?: string,"note"?: string,"recorded_on"?: string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_diary_entries_user_id_diary_id_fkey"
      columns: ["user_id","diary_id"]
isOneToOne: false
      referencedRelation: "exercise_diaries"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"rm_logs": {
                  Row: {
                    "category": string | null,"created_at": string,"definition_id": string | null,"deleted_at": string | null,"exercise_name": string,"id": string,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"definition_id"?: string | null,"deleted_at"?: string | null,"exercise_name": string,"id": string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"definition_id"?: string | null,"deleted_at"?: string | null,"exercise_name"?: string,"id"?: string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rm_logs_user_id_definition_id_fkey"
      columns: ["user_id","definition_id"]
isOneToOne: false
      referencedRelation: "exercise_definitions"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"rm_records": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"log_id": string,"notes": string | null,"recorded_on": string,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string,"weight": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"log_id": string,"notes"?: string | null,"recorded_on": string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string,"weight": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"log_id"?: string,"notes"?: string | null,"recorded_on"?: string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string,"weight"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "rm_records_user_id_log_id_fkey"
      columns: ["user_id","log_id"]
isOneToOne: false
      referencedRelation: "rm_logs"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"routine_exercises": {
                  Row: {
                    "category": string | null,"created_at": string,"definition_id": string | null,"deleted_at": string | null,"id": string,"image_url": string | null,"name": string,"notes": string | null,"position": number,"routine_id": string,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string,"video_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"definition_id"?: string | null,"deleted_at"?: string | null,"id": string,"image_url"?: string | null,"name": string,"notes"?: string | null,"position": number,"routine_id": string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string,"video_url"?: string | null
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"definition_id"?: string | null,"deleted_at"?: string | null,"id"?: string,"image_url"?: string | null,"name"?: string,"notes"?: string | null,"position"?: number,"routine_id"?: string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string,"video_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_exercises_user_id_definition_id_fkey"
      columns: ["user_id","definition_id"]
isOneToOne: false
      referencedRelation: "exercise_definitions"
      referencedColumns: ["user_id","id"]
    },{
      foreignKeyName: "routine_exercises_user_id_routine_id_fkey"
      columns: ["user_id","routine_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"name": string,"notes": string | null,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"name": string,"notes"?: string | null,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"workout_history": {
                  Row: {
                    "completed_at": string,"completion_percentage": number | null,"created_at": string,"deleted_at": string | null,"duration_seconds": number | null,"exercises_completed": number,"id": string,"routine_id": string | null,"routine_name": string,"server_revision": number,"server_updated_at": string,"sets_completed": number,"started_at": string | null,"total_sets_count": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at": string,"completion_percentage"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"duration_seconds"?: number | null,"exercises_completed"?: number,"id": string,"routine_id"?: string | null,"routine_name": string,"server_revision"?: number,"server_updated_at"?: string,"sets_completed"?: number,"started_at"?: string | null,"total_sets_count"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string,"completion_percentage"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"duration_seconds"?: number | null,"exercises_completed"?: number,"id"?: string,"routine_id"?: string | null,"routine_name"?: string,"server_revision"?: number,"server_updated_at"?: string,"sets_completed"?: number,"started_at"?: string | null,"total_sets_count"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_history_user_id_routine_id_fkey"
      columns: ["user_id","routine_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"workout_history_exercises": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"exercise_name": string,"exercises_completed": number,"history_id": string,"position": number,"server_revision": number,"server_updated_at": string,"sets_completed": number,"sets_total": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"exercise_name": string,"exercises_completed"?: number,"history_id": string,"position": number,"server_revision"?: number,"server_updated_at"?: string,"sets_completed"?: number,"sets_total"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"exercise_name"?: string,"exercises_completed"?: number,"history_id"?: string,"position"?: number,"server_revision"?: number,"server_updated_at"?: string,"sets_completed"?: number,"sets_total"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_history_exercises_user_id_history_id_fkey"
      columns: ["user_id","history_id"]
isOneToOne: false
      referencedRelation: "workout_history"
      referencedColumns: ["user_id","id"]
    }
                  ]
                },"workout_sets": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"position": number,"reps": NonNullable<Json>,"rest_seconds": Json | null,"routine_exercise_id": string,"routine_id": string,"server_revision": number,"server_updated_at": string,"updated_at": string,"user_id": string,"weight": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id": string,"position": number,"reps": NonNullable<Json>,"rest_seconds"?: Json | null,"routine_exercise_id": string,"routine_id": string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id": string,"weight": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"position"?: number,"reps"?: NonNullable<Json>,"rest_seconds"?: Json | null,"routine_exercise_id"?: string,"routine_id"?: string,"server_revision"?: number,"server_updated_at"?: string,"updated_at"?: string,"user_id"?: string,"weight"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "workout_sets_user_id_routine_id_routine_exercise_id_fkey"
      columns: ["user_id","routine_id","routine_exercise_id"]
isOneToOne: false
      referencedRelation: "routine_exercises"
      referencedColumns: ["user_id","routine_id","id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "get_sync_entitlement":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"sync_push":
{ Args: { "p_changes": Json,"p_operation_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
