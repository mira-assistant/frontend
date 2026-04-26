import axios from 'axios';

/** `BETA=true` → `/api/v2` (preview/staging API); otherwise `/api/v1`. Used for local + Vercel branch deploys. */
const isBeta = process.env.BETA === 'true';
const API_PREFIX = isBeta ? '/api/v2' : '/api/v1';

const apiUrl = process.env.API_URL || 'http://localhost:8000';
const baseURL = `${apiUrl}${API_PREFIX}`;

export const api = axios.create({
  baseURL,
  timeout: 10000,
});
