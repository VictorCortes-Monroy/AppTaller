export interface TokenPayload {
  sub: string;
  email: string;
  rol: string;
  idTaller: string;
  nombre: string;
  iat: number;
  exp: number;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function getUser(): TokenPayload | null {
  const token = getAccessToken();
  if (!token) return null;
  return decodeToken(token);
}

export function hasRole(roles: string[]): boolean {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.rol);
}
