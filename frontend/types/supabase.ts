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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          sender_id: string
          status: string
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          sender_id: string
          status?: string
          subject: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          sender_id?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: number
          key_hash: string
          last_used_at: string | null
          rate_limit_per_min: number
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: number
          key_hash: string
          last_used_at?: string | null
          rate_limit_per_min?: number
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: number
          key_hash?: string
          last_used_at?: string | null
          rate_limit_per_min?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_class_id: number | null
          course_id: number
          created_at: string
          description: string | null
          due_at: string | null
          id: number
          lesson_id: number | null
          points: number
          title: string
        }
        Insert: {
          course_class_id?: number | null
          course_id: number
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: number
          lesson_id?: number | null
          points?: number
          title: string
        }
        Update: {
          course_class_id?: number | null
          course_id?: number
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: number
          lesson_id?: number | null
          points?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_assignments_course_class_id"
            columns: ["course_class_id"]
            isOneToOne: false
            referencedRelation: "course_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          actor_id: string
          created_at: string
          entity_id: number | null
          entity_type: string | null
          id: number
          ip_address: unknown
        }
        Insert: {
          action?: string | null
          actor_id: string
          created_at?: string
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          ip_address?: unknown
        }
        Update: {
          action?: string | null
          actor_id?: string
          created_at?: string
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          ip_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_id: string | null
          certificate_url: string | null
          course_id: number
          id: number
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_id?: string | null
          certificate_url?: string | null
          course_id: number
          id?: number
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_id?: string | null
          certificate_url?: string | null
          course_id?: number
          id?: number
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          joined_at: string
          room_id: number
          user_id: string
        }
        Insert: {
          joined_at?: string
          room_id: number
          user_id: string
        }
        Update: {
          joined_at?: string
          room_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: number
          related_course_id: number | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: number
          related_course_id?: number | null
          type: string
        }
        Update: {
          created_at?: string
          id?: number
          related_course_id?: number | null
          type?: string
        }
        Relationships: []
      }
      class_members: {
        Row: {
          completed_at: string | null
          course_class_id: number
          enrolled_at: string
          id: number
          role: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_class_id: number
          enrolled_at?: string
          id?: number
          role?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_class_id?: number
          enrolled_at?: string
          id?: number
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_course_class_id_fkey"
            columns: ["course_class_id"]
            isOneToOne: false
            referencedRelation: "course_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          course_class_id: number
          day_of_week: number
          end_time: string
          id: number
          start_time: string
        }
        Insert: {
          course_class_id: number
          day_of_week: number
          end_time: string
          id?: number
          start_time: string
        }
        Update: {
          course_class_id?: number
          day_of_week?: number
          end_time?: string
          id?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_course_class_id_fkey"
            columns: ["course_class_id"]
            isOneToOne: false
            referencedRelation: "course_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          id: number
          is_published: boolean
          module_id: number
          order_index: number | null
          title: string
        }
        Insert: {
          id?: number
          is_published?: boolean
          module_id: number
          order_index?: number | null
          title: string
        }
        Update: {
          id?: number
          is_published?: boolean
          module_id?: number
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_classes: {
        Row: {
          course_id: number
          created_at: string
          description: string | null
          end_date: string | null
          id: number
          instructor_id: string | null
          is_published: boolean
          max_students: number | null
          name: string
          start_date: string | null
          status: string
        }
        Insert: {
          course_id: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: number
          instructor_id?: string | null
          is_published?: boolean
          max_students?: number | null
          name: string
          start_date?: string | null
          status?: string
        }
        Update: {
          course_id?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: number
          instructor_id?: string | null
          is_published?: boolean
          max_students?: number | null
          name?: string
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_members: {
        Row: {
          completed_at: string | null
          course_id: number
          id: number
          joined_at: string
          last_accessed_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: number
          id?: number
          joined_at?: string
          last_accessed_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: number
          id?: number
          joined_at?: string
          last_accessed_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_prerequisites: {
        Row: {
          course_id: number
          prerequisite_course_id: number
        }
        Insert: {
          course_id: number
          prerequisite_course_id: number
        }
        Update: {
          course_id?: number
          prerequisite_course_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_prerequisites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_prerequisites_prerequisite_course_id_fkey"
            columns: ["prerequisite_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: number
          created_at: string
          id: number
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: number
          created_at?: string
          id?: number
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: number
          created_at?: string
          id?: number
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: number
          learning_objectives: Json
          level: string
          organization_id: number
          prerequisites: Json
          status: string
          tags: Json
          thumbnail: string | null
          title: string
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: number
          learning_objectives?: Json
          level?: string
          organization_id: number
          prerequisites?: Json
          status?: string
          tags?: Json
          thumbnail?: string | null
          title: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: number
          learning_objectives?: Json
          level?: string
          organization_id?: number
          prerequisites?: Json
          status?: string
          tags?: Json
          thumbnail?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          created_at: string
          file_url: string | null
          id: number
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: number
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: number
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: number
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: number
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: number
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          class_member_id: number | null
          completed_at: string | null
          created_at: string
          id: number
          last_accessed_at: string | null
          lesson_id: number
          progress_percent: number | null
          status: string
          user_id: string
        }
        Insert: {
          class_member_id?: number | null
          completed_at?: string | null
          created_at?: string
          id?: number
          last_accessed_at?: string | null
          lesson_id: number
          progress_percent?: number | null
          status?: string
          user_id: string
        }
        Update: {
          class_member_id?: number | null
          completed_at?: string | null
          created_at?: string
          id?: number
          last_accessed_at?: string | null
          lesson_id?: number
          progress_percent?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lesson_progress_class_member_id"
            columns: ["class_member_id"]
            isOneToOne: false
            referencedRelation: "class_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lesson_progress_lesson_id"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_lesson_progress_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: number | null
          content_json: Json | null
          content_type: string | null
          content_url: string | null
          duration_seconds: number | null
          id: number
          is_free_preview: boolean
          is_published: boolean
          order_index: number | null
          title: string
          video_thumbnail: string | null
        }
        Insert: {
          class_id?: number | null
          content_json?: Json | null
          content_type?: string | null
          content_url?: string | null
          duration_seconds?: number | null
          id?: number
          is_free_preview?: boolean
          is_published?: boolean
          order_index?: number | null
          title: string
          video_thumbnail?: string | null
        }
        Update: {
          class_id?: number | null
          content_json?: Json | null
          content_type?: string | null
          content_url?: string | null
          duration_seconds?: number | null
          id?: number
          is_free_preview?: boolean
          is_published?: boolean
          order_index?: number | null
          title?: string
          video_thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: number
          message_type: string
          room_id: number
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          message_type?: string
          room_id: number
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          message_type?: string
          room_id?: number
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: number
          id: number
          is_published: boolean
          order_index: number | null
          title: string
        }
        Insert: {
          course_id: number
          id?: number
          is_published?: boolean
          order_index?: number | null
          title: string
        }
        Update: {
          course_id?: number
          id?: number
          is_published?: boolean
          order_index?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          assignment_reminders: boolean
          course_updates: boolean
          email_enabled: boolean
          marketing_emails: boolean
          message_notifications: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_reminders?: boolean
          course_updates?: boolean
          email_enabled?: boolean
          marketing_emails?: boolean
          message_notifications?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_reminders?: boolean
          course_updates?: boolean
          email_enabled?: boolean
          marketing_emails?: boolean
          message_notifications?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_preferences_user_id_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: number
          link: string | null
          read_at: string | null
          title: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          link?: string | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          link?: string | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string
          domain: string
          id: number
          organization_id: number
        }
        Insert: {
          created_at?: string
          domain: string
          id?: number
          organization_id: number
        }
        Update: {
          created_at?: string
          domain?: string
          id?: number
          organization_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: number
          member_role: string
          organization_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          member_role?: string
          organization_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          member_role?: string
          organization_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_verification_requests: {
        Row: {
          admin_email: string
          created_at: string
          expires_at: string
          id: number
          org_name: string
          organization_id: number | null
          requested_by: string
          status: string
          token_hash: string
          verified_at: string | null
        }
        Insert: {
          admin_email: string
          created_at?: string
          expires_at: string
          id?: number
          org_name: string
          organization_id?: number | null
          requested_by: string
          status?: string
          token_hash: string
          verified_at?: string | null
        }
        Update: {
          admin_email?: string
          created_at?: string
          expires_at?: string
          id?: number
          org_name?: string
          organization_id?: number | null
          requested_by?: string
          status?: string
          token_hash?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_verification_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_verification_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: number
          name: string
          slug: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: number
          name: string
          slug?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: number
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          id: number
        }
        Insert: {
          code: string
          id?: number
        }
        Update: {
          code?: string
          id?: number
        }
        Relationships: []
      }
      profile_educations: {
        Row: {
          created_at: string
          degree: string | null
          description: string | null
          end_year: number | null
          field_of_study: string | null
          id: number
          institution_name: string
          is_current: boolean
          order_index: number
          profile_id: string
          start_year: number | null
        }
        Insert: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_year?: number | null
          field_of_study?: string | null
          id?: never
          institution_name: string
          is_current?: boolean
          order_index?: number
          profile_id: string
          start_year?: number | null
        }
        Update: {
          created_at?: string
          degree?: string | null
          description?: string | null
          end_year?: number | null
          field_of_study?: string | null
          id?: never
          institution_name?: string
          is_current?: boolean
          order_index?: number
          profile_id?: string
          start_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profile_educations_profile_id_profiles"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          created_at: string
          department: string | null
          enabled_mfa: boolean
          first_name: string | null
          has_password: boolean | null
          id: string
          interests: Json | null
          invite_code: string | null
          invited_by: string | null
          job_title: string | null
          language: string | null
          last_name: string | null
          onboarded: boolean
          phone_number: string | null
          professional_summary: string | null
          social_links: Json | null
          timezone: string | null
          username: string | null
          years_of_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          department?: string | null
          enabled_mfa?: boolean
          first_name?: string | null
          has_password?: boolean | null
          id: string
          interests?: Json | null
          invite_code?: string | null
          invited_by?: string | null
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          onboarded?: boolean
          phone_number?: string | null
          professional_summary?: string | null
          social_links?: Json | null
          timezone?: string | null
          username?: string | null
          years_of_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          created_at?: string
          department?: string | null
          enabled_mfa?: boolean
          first_name?: string | null
          has_password?: boolean | null
          id?: string
          interests?: Json | null
          invite_code?: string | null
          invited_by?: string | null
          job_title?: string | null
          language?: string | null
          last_name?: string | null
          onboarded?: boolean
          phone_number?: string | null
          professional_summary?: string | null
          social_links?: Json | null
          timezone?: string | null
          username?: string | null
          years_of_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_invited_by_profiles"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: number
          role_id: number
        }
        Insert: {
          permission_id: number
          role_id: number
        }
        Update: {
          permission_id?: number
          role_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: number
          name: string
          organization_id: number | null
        }
        Insert: {
          id?: number
          name: string
          organization_id?: number | null
        }
        Update: {
          id?: number
          name?: string
          organization_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assignment_id: number
          content_url: string | null
          feedback: string | null
          grade: number | null
          id: number
          submitted_at: string
          text_content: string | null
          user_id: string
        }
        Insert: {
          assignment_id: number
          content_url?: string | null
          feedback?: string | null
          grade?: number | null
          id?: number
          submitted_at?: string
          text_content?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: number
          content_url?: string | null
          feedback?: string | null
          grade?: number | null
          id?: number
          submitted_at?: string
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string | null
          created_at: string
          entity_id: number | null
          entity_type: string | null
          id: number
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string | null
          created_at?: string
          entity_id?: number | null
          entity_type?: string | null
          id?: number
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          accepted_at: string
          id: number
          type: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: number
          type?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: number
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mfa: {
        Row: {
          backup_codes: Json | null
          created_at: string
          id: number
          totp_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string
          id?: never
          totp_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string
          id?: never
          totp_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_mfa_user_id_profiles"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          organization_id: number
          role_id: number
          user_id: string
        }
        Insert: {
          organization_id: number
          role_id: number
          user_id: string
        }
        Update: {
          organization_id?: number
          role_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          level: number
          skill_id: number
          user_id: string
          years: number
        }
        Insert: {
          level: number
          skill_id: number
          user_id: string
          years: number
        }
        Update: {
          level?: number
          skill_id?: number
          user_id?: string
          years?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_skills_skill_id_skills"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_skills_user_id_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_requests: {
        Row: {
          id: string;
          user_id: string;
          organization_id: number;
          status: 'pending' | 'approved' | 'rejected';
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          message: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: number;
          status?: 'pending' | 'approved' | 'rejected';
          requested_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          message?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: number;
          status?: 'pending' | 'approved' | 'rejected';
          requested_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
