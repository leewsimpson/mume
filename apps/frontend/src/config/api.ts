/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// WebSocket URL - convert HTTP(S) to WS(S)
export const WS_URL = API_URL.replace(/^http/, 'ws');

console.log('API Configuration:', { API_URL, WS_URL });
