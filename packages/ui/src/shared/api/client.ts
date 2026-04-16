import axios from 'axios';

const isBeta = process.env.BETA === 'true';
const API_PREFIX = isBeta ? '/api/v2' : '/api/v1';

const apiUrl = process.env.MIRA_API_URL || 'http://localhost:8000';
const baseURL = `${apiUrl}${API_PREFIX}`;

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
