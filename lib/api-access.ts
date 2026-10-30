const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/activate',
  '/api/auth/session',
  '/api/auth/logout',
  '/api/health',
]);

export function isPublicApiRequest(pathname: string, method: string) {
  if (PUBLIC_API_PATHS.has(pathname)) return true;
  // DetallWPF sincroniza tickets con una clave propia que valida la ruta.
  if (pathname === '/api/tickets' && method.toUpperCase() === 'POST') return true;
  return false;
}
