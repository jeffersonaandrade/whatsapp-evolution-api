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

  /**
   * Utilitário para logs estruturados
   */
  private log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      service: 'EvolutionAPI',
      message,
      ...context,
    };
    
    if (level === 'error') {
      console.error(`[${timestamp}] [EvolutionAPI] [ERROR] ${message}`, context || '');
    } else if (level === 'warn') {
      console.warn(`[${timestamp}] [EvolutionAPI] [WARN] ${message}`, context || '');
    } else {
      console.log(`[${timestamp}] [EvolutionAPI] [INFO] ${message}`, context || '');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const method = options.method || 'GET';
    const url = `${this.baseURL}${endpoint}`;

    try {
      this.log('info', 'Iniciando requisição para Evolution API', {
        requestId,
        method,
        endpoint,
        url,
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
      });

      const headers = {
        'Content-Type': 'application/json',
        'apikey': this.apiKey,
        ...options.headers,
      };

      // Timeout de 30 segundos para requisições externas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

      let response: Response;
      try {
        response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Verificar se foi timeout
        if (fetchError?.name === 'AbortError') {
          this.log('error', 'Timeout na requisição para Evolution API', {
            requestId,
            method,
            endpoint,
            url,
            timeout: '30s',
            duration: `${Date.now() - startTime}ms`,
          });
          return {
            success: false,
            error: 'Timeout na requisição (30s)',
          };
        }
        
        // Re-throw outros erros para serem tratados pelo catch externo
        throw fetchError;
      }

      const duration = Date.now() - startTime;

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (parseError) {
          // Se não conseguir fazer parse do JSON, tenta ler como texto
          try {
            const text = await response.text();
            errorData = { raw: text };
          } catch {
            errorData = { message: 'Erro ao processar resposta' };
          }
        }

        const errorMessage = 
          errorData.message || 
          errorData.error || 
          errorData.response?.message || 
          `HTTP ${response.status}`;

        // Incluir status code no erro para facilitar tratamento
        const errorWithStatus = `${errorMessage} (${response.status})`;

        this.log('error', 'Erro na requisição para Evolution API', {
          requestId,
          method,
          endpoint,
          url,
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorData,
          duration: `${duration}ms`,
        });

        return {
          success: false,
          error: errorWithStatus,
        };
      }

      let data: T;
      try {
        data = await response.json();
        
        // Log da estrutura da resposta para debug (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development' && endpoint.includes('connect')) {
          this.log('info', 'Estrutura da resposta da Evolution API (connect)', {
            requestId,
            endpoint,
            dataKeys: data ? Object.keys(data as any) : [],
            hasQrcode: !!(data as any)?.qrcode,
            hasBase64: !!(data as any)?.base64,
            hasCode: !!(data as any)?.code,
            qrcodeType: (data as any)?.qrcode ? typeof (data as any).qrcode : 'undefined',
          });
        }
      } catch (parseError) {
        this.log('error', 'Erro ao fazer parse da resposta JSON', {
          requestId,
          method,
          endpoint,
          url,
          error: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
          duration: `${duration}ms`,
        });
        return {
          success: false,
          error: 'Erro ao processar resposta da Evolution API',
        };
      }

      this.log('info', 'Requisição para Evolution API concluída com sucesso', {
        requestId,
        method,
        endpoint,
        url,
        status: response.status,
        duration: `${duration}ms`,
      });

      return { success: true, data };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Verificar se é erro de conexão
      const isConnectionError = 
        error instanceof TypeError && 
        (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'));

      if (isConnectionError) {
        this.log('error', 'Erro de conexão com Evolution API - serviço pode estar offline', {
          requestId,
          method,
          endpoint,
          url,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          hint: 'Verifique se a Evolution API está rodando e acessível',
          duration: `${duration}ms`,
        });
      } else {
        this.log('error', 'Erro inesperado na requisição para Evolution API', {
          requestId,
          method,
          endpoint,
          url,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          duration: `${duration}ms`,
        });
      }

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
    this.log('info', 'Criando nova instância', { instanceName });

    const result = await this.request<EvolutionAPIResponse>('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });

    if (!result.success) {
      this.log('error', 'Falha ao criar instância', {
        instanceName,
        error: result.error,
      });
      return {
        success: false,
        error: result.error,
      };
    }

    this.log('info', 'Instância criada com sucesso', {
      instanceName,
      hasQRCode: !!(result.data?.qrcode?.base64 || result.data?.qrcode?.code),
    });

    return {
      success: true,
      data: result.data?.qrcode,
    };
  }

  /**
   * Conectar instância e obter QR Code
   */
  async connectInstance(instanceName: string): Promise<{ success: boolean; data?: EvolutionAPIQRCode; error?: string }> {
    this.log('info', 'Obtendo QR Code da instância', { instanceName });

    const result = await this.request<EvolutionAPIResponse>(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });

    if (!result.success) {
      this.log('error', 'Falha ao obter QR Code', {
        instanceName,
        error: result.error,
      });
      return {
        success: false,
        error: result.error,
      };
    }

    // DEBUG: Log completo do payload bruto da Evolution API
    const rawData = result.data as any;
    console.log('='.repeat(80));
    console.log('[EvolutionAPI] [DEBUG] Payload completo da resposta /instance/connect:');
    console.log(JSON.stringify(rawData, null, 2));
    console.log('='.repeat(80));
    
    // Log estruturado também
    this.log('info', 'Payload completo da Evolution API recebido', {
      instanceName,
      payloadType: typeof rawData,
      payloadKeys: rawData ? Object.keys(rawData) : [],
      payloadStringified: JSON.stringify(rawData),
    });

    // A Evolution API pode retornar o QR Code em diferentes formatos
    // Tenta extrair de várias possíveis estruturas
    let qrcode: string | null = null;
    
    // Tenta diferentes caminhos possíveis
    if (rawData?.qrcode) {
      if (typeof rawData.qrcode === 'string') {
        qrcode = rawData.qrcode;
        this.log('info', 'QR Code encontrado em qrcode (string)', { instanceName });
      } else if (rawData.qrcode.base64) {
        qrcode = rawData.qrcode.base64;
        this.log('info', 'QR Code encontrado em qrcode.base64', { instanceName });
      } else if (rawData.qrcode.code) {
        qrcode = rawData.qrcode.code;
        this.log('info', 'QR Code encontrado em qrcode.code', { instanceName });
      }
    } else if (rawData?.base64) {
      qrcode = rawData.base64;
      this.log('info', 'QR Code encontrado em base64', { instanceName });
    } else if (rawData?.code) {
      qrcode = rawData.code;
      this.log('info', 'QR Code encontrado em code', { instanceName });
    } else if (rawData?.qrcode?.base64) {
      qrcode = rawData.qrcode.base64;
      this.log('info', 'QR Code encontrado em qrcode.base64 (nested)', { instanceName });
    } else if (rawData?.qrcode?.code) {
      qrcode = rawData.qrcode.code;
      this.log('info', 'QR Code encontrado em qrcode.code (nested)', { instanceName });
    } else {
      // Se não encontrou, tenta buscar em qualquer propriedade que contenha 'qr' ou 'code'
      const allKeys = rawData ? Object.keys(rawData) : [];
      for (const key of allKeys) {
        const value = rawData[key];
        if (typeof value === 'string' && value.length > 100 && (key.toLowerCase().includes('qr') || key.toLowerCase().includes('code'))) {
          qrcode = value;
          this.log('info', `QR Code encontrado em propriedade: ${key}`, { instanceName });
          break;
        } else if (value && typeof value === 'object') {
          // Busca recursivamente em objetos aninhados
          if (value.base64 && typeof value.base64 === 'string') {
            qrcode = value.base64;
            this.log('info', `QR Code encontrado em ${key}.base64`, { instanceName });
            break;
          } else if (value.code && typeof value.code === 'string') {
            qrcode = value.code;
            this.log('info', `QR Code encontrado em ${key}.code`, { instanceName });
            break;
          }
        }
      }
    }
    
    this.log('info', 'QR Code obtido com sucesso', {
      instanceName,
      hasQRCode: !!qrcode,
      dataKeys: rawData ? Object.keys(rawData) : [],
      qrcodeType: qrcode ? typeof qrcode : 'null',
      qrcodeLength: qrcode?.length || 0,
      qrcodePreview: qrcode ? qrcode.substring(0, 50) + '...' : null,
    });

    return {
      success: true,
      data: qrcode ? {
        base64: qrcode,
        code: qrcode,
      } : undefined,
    };
  }

  /**
   * Obter status da conexão
   */
  async getInstanceStatus(instanceName: string): Promise<{ success: boolean; data?: { state: string }; error?: string }> {
    this.log('info', 'Verificando status da instância', { instanceName });

    const result = await this.request<EvolutionAPIResponse>(`/instance/connectionState/${instanceName}`, {
      method: 'GET',
    });

    if (!result.success) {
      this.log('error', 'Falha ao verificar status da instância', {
        instanceName,
        error: result.error,
      });
      return {
        success: false,
        error: result.error,
      };
    }

    const state = result.data?.state || 'close';
    this.log('info', 'Status da instância obtido', {
      instanceName,
      state,
    });

    return {
      success: true,
      data: { state },
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

