import { NextRequest } from 'next/server';

interface AuthenticatedUser {
  id: string;
  accountId: string;
  email?: string;
  name?: string;
}

/**
 * Obtém usuário autenticado a partir de cookies
 * Lê o cookie que contém dados do usuário logado
 * Tenta diferentes nomes comuns de cookies
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Lista de nomes possíveis para o cookie de usuário
    const cookieNames = ['user', 'auth', 'auth-user', 'session', 'user_session'];
    
    let userCookie = null;
    let cookieName = null;
    
    // Tenta encontrar o cookie com dados do usuário
    for (const name of cookieNames) {
      const cookie = request.cookies.get(name);
      if (cookie?.value) {
        userCookie = cookie;
        cookieName = name;
        break;
      }
    }
    
    if (!userCookie?.value) {
      // Log todos os cookies disponíveis para debug
      const allCookies = request.cookies.getAll();
      const cookieNames = allCookies.map(c => c.name);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUTH] Nenhum cookie de usuário encontrado', {
          timestamp: new Date().toISOString(),
          availableCookies: cookieNames,
          searchedCookies: cookieNames,
        });
      } else {
        // Em produção, log apenas se não houver cookies
        if (cookieNames.length === 0) {
          console.warn('[AUTH] Nenhum cookie encontrado na requisição', {
            timestamp: new Date().toISOString(),
          });
        }
      }
      return null;
    }

    // Parse do cookie (pode ser JSON ou formato específico)
    let cookieData: any;
    try {
      cookieData = JSON.parse(decodeURIComponent(userCookie.value));
    } catch (parseError) {
      // Se não for JSON, tenta parse direto
      try {
        cookieData = JSON.parse(userCookie.value);
      } catch (secondParseError) {
        console.error('[AUTH] Erro ao fazer parse do cookie', {
          timestamp: new Date().toISOString(),
          cookieName,
          firstError: parseError instanceof Error ? parseError.message : 'Erro desconhecido',
          secondError: secondParseError instanceof Error ? secondParseError.message : 'Erro desconhecido',
          cookieValueLength: userCookie.value.length,
          cookieValuePreview: userCookie.value.substring(0, 100),
        });
        return null;
      }
    }

    // O cookie pode ter formato: { user: {...} } ou { ... } diretamente
    const userData = cookieData.user || cookieData;

    // Log do cookie encontrado (apenas dados não sensíveis)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUTH] Cookie de autenticação encontrado', {
        timestamp: new Date().toISOString(),
        cookieName,
        userId: userData.id || userData.userId,
        accountId: userData.accountId || userData.account_id,
        email: userData.email,
        hasAccountId: !!(userData.accountId || userData.account_id),
      });
    }

    // Valida se tem accountId
    const accountId = userData.accountId || userData.account_id;
    if (!accountId) {
      console.error('[AUTH] Cookie encontrado mas sem accountId', {
        timestamp: new Date().toISOString(),
        cookieName,
        cookieDataKeys: Object.keys(cookieData),
        userDataKeys: Object.keys(userData),
        userId: userData.id || userData.userId,
      });
      return null;
    }

    return {
      id: userData.id || userData.userId || userData.user_id,
      accountId: accountId,
      email: userData.email,
      name: userData.name,
    };
  } catch (error) {
    console.error('[AUTH] Erro ao ler cookie de autenticação:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  return user;
}

