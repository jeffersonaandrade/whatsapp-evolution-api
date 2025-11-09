// Tipos gerados do Supabase
// Este arquivo será preenchido quando o banco de dados for criado
// Por enquanto, definimos uma estrutura básica

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          company_name: string | null
          business_type: string | null
          business_description: string | null
          opening_hours: Json | null
          address: string | null
          phone: string | null
          delivery_available: boolean | null
          delivery_fee: number | null
          welcome_message: string | null
          default_message: string | null
          transfer_keywords: string[] | null
          transfer_message: string | null
          bot_personality: string | null
          groq_api_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          company_name?: string | null
          business_type?: string | null
          business_description?: string | null
          opening_hours?: Json | null
          address?: string | null
          phone?: string | null
          delivery_available?: boolean | null
          delivery_fee?: number | null
          welcome_message?: string | null
          default_message?: string | null
          transfer_keywords?: string[] | null
          transfer_message?: string | null
          bot_personality?: string | null
          groq_api_key?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          company_name?: string | null
          business_type?: string | null
          business_description?: string | null
          opening_hours?: Json | null
          address?: string | null
          phone?: string | null
          delivery_available?: boolean | null
          delivery_fee?: number | null
          welcome_message?: string | null
          default_message?: string | null
          transfer_keywords?: string[] | null
          transfer_message?: string | null
          bot_personality?: string | null
          groq_api_key?: string | null
          created_at?: string
        }
      }
      instances: {
        Row: {
          id: string
          account_id: string
          name: string
          status: 'connected' | 'disconnected' | 'connecting'
          phone_number: string | null
          profile_pic_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          status?: 'connected' | 'disconnected' | 'connecting'
          phone_number?: string | null
          profile_pic_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          status?: 'connected' | 'disconnected' | 'connecting'
          phone_number?: string | null
          profile_pic_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          account_id: string
          phone_number: string
          name: string | null
          profile_pic_url: string | null
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          phone_number: string
          name?: string | null
          profile_pic_url?: string | null
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          phone_number?: string
          name?: string | null
          profile_pic_url?: string | null
          tags?: string[] | null
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          instance_id: string
          contact_id: string
          status: 'bot' | 'waiting_agent' | 'in_service' | 'resolved'
          assigned_to: string | null
          last_message_at: string | null
          transferred_at: string | null
          transfer_reason: string | null
          bot_handoff_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          contact_id: string
          status?: 'bot' | 'waiting_agent' | 'in_service' | 'resolved'
          assigned_to?: string | null
          last_message_at?: string | null
          transferred_at?: string | null
          transfer_reason?: string | null
          bot_handoff_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          instance_id?: string
          contact_id?: string
          status?: 'bot' | 'waiting_agent' | 'in_service' | 'resolved'
          assigned_to?: string | null
          last_message_at?: string | null
          transferred_at?: string | null
          transfer_reason?: string | null
          bot_handoff_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          from_me: boolean
          body: string
          timestamp: string
          status: 'sent' | 'delivered' | 'read'
          sent_by: 'bot' | 'agent' | 'customer'
          agent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          from_me: boolean
          body: string
          timestamp: string
          status?: 'sent' | 'delivered' | 'read'
          sent_by?: 'bot' | 'agent' | 'customer'
          agent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          from_me?: boolean
          body?: string
          timestamp?: string
          status?: 'sent' | 'delivered' | 'read'
          sent_by?: 'bot' | 'agent' | 'customer'
          agent_id?: string | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          account_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          instance_id: string
          group_id: string
          name: string
          description: string | null
          auto_subscribe: boolean
          keywords: string[] | null
          welcome_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          group_id: string
          name: string
          description?: string | null
          auto_subscribe?: boolean
          keywords?: string[] | null
          welcome_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          instance_id?: string
          group_id?: string
          name?: string
          description?: string | null
          auto_subscribe?: boolean
          keywords?: string[] | null
          welcome_message?: string | null
          created_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          instance_id: string
          name: string
          message: string
          media_url: string | null
          media_type: string | null
          target_groups: Json | null
          status: 'draft' | 'scheduled' | 'sent' | 'failed'
          scheduled_for: string | null
          sent_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          name: string
          message: string
          media_url?: string | null
          media_type?: string | null
          target_groups?: Json | null
          status?: 'draft' | 'scheduled' | 'sent' | 'failed'
          scheduled_for?: string | null
          sent_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          instance_id?: string
          name?: string
          message?: string
          media_url?: string | null
          media_type?: string | null
          target_groups?: Json | null
          status?: 'draft' | 'scheduled' | 'sent' | 'failed'
          scheduled_for?: string | null
          sent_at?: string | null
          created_by?: string
          created_at?: string
        }
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
  }
}

