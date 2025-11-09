import { EvolutionAPIInstance, EvolutionAPIQRCode, EvolutionAPIMessage } from '@/types';

const EVOLUTION_API_URL = process.env.NEXT_PUBLIC_EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

interface EvolutionAPIResponse<T = any> {
  instance?: EvolutionAPIInstance;
  qrcode?: EvolutionAPIQRCode;
  state?: 'open' | 'close' | 'connecting';
  message?: string;
  error?: string;
  [key: string]: any;
}

class EvolutionAPIClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = EVOLUTION_API_URL;
    this.apiKey = EVOLUTION_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || errorData.error || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Criar uma nova instância
   */
  async createInstance(instanceName: string): Promise<{ success: boolean; data?: EvolutionAPIQRCode; error?: string }> {
    const result = await this.request<EvolutionAPIResponse>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
      }),
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data?.qrcode,
    };
  }

  /**
   * Conectar instância e obter QR Code
   */
  async connectInstance(instanceName: string): Promise<{ success: boolean; data?: EvolutionAPIQRCode; error?: string }> {
    const result = await this.request<EvolutionAPIResponse>(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: result.data?.qrcode,
    };
  }

  /**
   * Obter status da conexão
   */
  async getInstanceStatus(instanceName: string): Promise<{ success: boolean; data?: { state: string }; error?: string }> {
    const result = await this.request<EvolutionAPIResponse>(`/instance/connectionState/${instanceName}`, {
      method: 'GET',
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { state: result.data?.state || 'close' },
    };
  }

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(
    instanceName: string,
    number: string,
    text: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        text,
      }),
    });
  }

  /**
   * Enviar mídia
   */
  async sendMedia(
    instanceName: string,
    number: string,
    mediaUrl: string,
    caption?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.request(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        mediaUrl,
        caption,
      }),
    });
  }

  /**
   * Buscar todos os grupos
   */
  async fetchGroups(instanceName: string): Promise<{ success: boolean; data?: { groups: any[] }; error?: string }> {
    const result = await this.request<{ groups: any[] }>(`/group/fetchAllGroups/${instanceName}`, {
      method: 'GET',
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: { groups: result.data?.groups || [] },
    };
  }

  /**
   * Enviar mensagem para grupo
   */
  async sendGroupMessage(
    instanceName: string,
    groupId: string,
    text: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.sendTextMessage(instanceName, `${groupId}@g.us`, text);
  }

  /**
   * Desconectar instância
   */
  async logoutInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.request(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });

    return result;
  }

  /**
   * Deletar instância
   */
  async deleteInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.request(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });

    return result;
  }
}

export const evolutionAPI = new EvolutionAPIClient();

