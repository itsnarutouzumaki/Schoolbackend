import { ApiError } from '../errors/index.js';
import type { AuthContext, TenantContext } from './api-response.types.js';
import type { RequestLocals } from './api-response.types.js';

export function requireTenantContext(locals: RequestLocals): TenantContext {
  if (!locals.tenant) {
    throw new ApiError(500, 'TENANT_CONTEXT_MISSING', 'The request tenant context is unavailable.', true);
  }
  return locals.tenant;
}

export function requireAuthContext(locals: RequestLocals): AuthContext {
  if (!locals.auth) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }
  return locals.auth;
}
