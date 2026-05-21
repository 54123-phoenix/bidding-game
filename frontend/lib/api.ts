/**
 * API configuration and base URL for all frontend requests.
 * Reads from NEXT_PUBLIC_API_URL environment variable at build time,
 * falls back to localhost for development.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
