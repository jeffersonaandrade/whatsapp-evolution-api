// Evolution API Types
export interface EvolutionAPIInstance {
  instanceName: string;
  status: 'created' | 'connected' | 'disconnected' | 'connecting';
}

export interface EvolutionAPIQRCode {
  base64?: string;
  code?: string;
}

export interface EvolutionAPIMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      caption?: string;
    };
  };
  pushName?: string;
  timestamp?: number;
}

export interface EvolutionAPIWebhook {
  event: 'messages.upsert' | 'connection.update' | 'qrcode.update';
  data: {
    instanceName: string;
    state?: 'open' | 'close' | 'connecting';
    qrcode?: EvolutionAPIQRCode;
    messages?: EvolutionAPIMessage[];
  };
}

// Supabase Types
export interface Account {
  id: string;
  name: string;
  company_name?: string;
  business_type?: string;
  business_description?: string;
  opening_hours?: Record<string, any>;
  address?: string;
  phone?: string;
  delivery_available?: boolean;
  delivery_fee?: number;
  welcome_message?: string;
  default_message?: string;
  transfer_keywords?: string[];
  transfer_message?: string;
  bot_personality?: string;
  groq_api_key?: string;
  created_at: string;
}

export interface Instance {
  id: string;
  account_id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  phone_number?: string;
  profile_pic_url?: string;
  qr_code?: string; // QR Code em base64 recebido via webhook
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  account_id: string;
  phone_number: string;
  name?: string;
  profile_pic_url?: string;
  tags?: string[];
  created_at: string;
}

export interface Conversation {
  id: string;
  instance_id: string;
  contact_id: string;
  status: 'bot' | 'waiting_agent' | 'in_service' | 'resolved';
  assigned_to?: string;
  last_message_at?: string;
  transferred_at?: string;
  transfer_reason?: string;
  bot_handoff_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  from_me: boolean;
  body: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  sent_by: 'bot' | 'agent' | 'customer';
  agent_id?: string;
  created_at: string;
}

export interface Product {
  id: string;
  account_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppGroup {
  id: string;
  instance_id: string;
  group_id: string;
  name: string;
  description?: string;
  auto_subscribe: boolean;
  keywords?: string[];
  welcome_message?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  instance_id: string;
  name: string;
  message: string;
  media_url?: string;
  media_type?: string;
  target_groups?: any;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduled_for?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

