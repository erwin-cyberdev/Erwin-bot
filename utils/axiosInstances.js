// utils/axiosInstances.js - Instances Axios optimisées avec keep-alive

import axios from 'axios'
import http from 'http'
import https from 'https'

// Configuration des agents HTTP/HTTPS avec keep-alive
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
})

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
})

/**
 * Instance Axios par défaut avec keep-alive
 */
export const axiosInstance = axios.create({
  timeout: 15000,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024,
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Erwin-Bot/1.0'
  }
})

/**
 * Instance pour les APIs rapides (timeout court)
 */
export const axiosFast = axios.create({
  timeout: 5000,
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Erwin-Bot/1.0'
  }
})

/**
 * Instance pour les médias (timeout long, large content)
 */
export const axiosMedia = axios.create({
  timeout: 30000,
  maxContentLength: 100 * 1024 * 1024, // 100MB
  maxBodyLength: 100 * 1024 * 1024,
  responseType: 'arraybuffer',
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Erwin-Bot/1.0'
  }
})

/**
 * Instance pour les APIs de Reddit/Memes
 */
export const axiosReddit = axios.create({
  timeout: 10000,
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Erwin-Bot/1.0 (Reddit API Client)'
  }
})

/**
 * Instance pour les APIs JSON (pas de buffer)
 */
export const axiosJSON = axios.create({
  timeout: 10000,
  httpAgent,
  httpsAgent,
  headers: {
    'User-Agent': 'Erwin-Bot/1.0',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Intercepteur global pour logger les erreurs réseau
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.warn('⏱️ Timeout réseau:', error.config?.url)
    } else if (error.response) {
      console.warn(`⚠️ Erreur HTTP ${error.response.status}:`, error.config?.url)
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
