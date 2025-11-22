/**
 * Utilitários de validação e sanitização
 * Protege contra ataques de injeção e dados inválidos
 */

// Validação sem dependência externa (validator é opcional)
// Se precisar de validação mais robusta, instalar: npm install validator

/**
 * Valida e sanitiza string
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new Error('Input deve ser uma string');
  }

  // Remove caracteres de controle e limita tamanho
  let sanitized = input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim()
    .substring(0, maxLength);

  // Escapa HTML para prevenir XSS (básico, sem dependência externa)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Valida email (formato básico)
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Valida UUID (formato básico)
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida número de telefone (formato básico)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove caracteres não numéricos
  const digits = phone.replace(/\D/g, '');
  // Deve ter entre 10 e 15 dígitos
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Valida instanceName (apenas letras, números, hífens e underscores)
 */
export function validateInstanceName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 100;
}

/**
 * Valida tamanho do body da requisição
 */
export function validateBodySize(body: string, maxSize: number = 1024 * 1024): boolean {
  return Buffer.byteLength(body, 'utf8') <= maxSize;
}

/**
 * Sanitiza object recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T, maxDepth: number = 5): T {
  if (maxDepth <= 0) {
    return obj;
  }

  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value, maxDepth - 1) as T[keyof T];
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeString(item);
        } else if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item, maxDepth - 1);
        }
        return item;
      }) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Valida formato de URL
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Valida e sanitiza número
 */
export function validateNumber(value: unknown, min?: number, max?: number): number {
  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num)) {
    throw new Error('Valor deve ser um número válido');
  }

  if (min !== undefined && num < min) {
    throw new Error(`Valor deve ser maior ou igual a ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Valor deve ser menor ou igual a ${max}`);
  }

  return num;
}

