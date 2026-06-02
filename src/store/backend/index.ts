import type { Backend } from './types';
import { localBackend } from './local';
import { apiBackend, isApiMode } from './api';

export const backend: Backend = isApiMode() ? apiBackend : localBackend;
export { isApiMode } from './api';
export { apiMe, apiLogin, apiLogout } from './api';
export type { Change, EntityName, SingletonName, AuthUser } from './types';
export { ENTITY_NAMES, SINGLETON_NAMES } from './types';
