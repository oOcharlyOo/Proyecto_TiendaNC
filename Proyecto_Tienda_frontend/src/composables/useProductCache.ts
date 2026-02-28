import { ref } from 'vue'

const CACHE_KEY = 'productos_cache'
const CACHE_TIMESTAMP_KEY = 'productos_cache_timestamp'
const CACHE_DURATION = 1000 * 60 * 30

interface CacheData<T> {
  data: T
  timestamp: number
}

export function useProductCache() {
  function getCached<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null
      
      const parsed: CacheData<T> = JSON.parse(cached)
      const now = Date.now()
      
      if (now - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(key)
        return null
      }
      
      return parsed.data
    } catch {
      return null
    }
  }

  function setCache<T>(key: string, data: T): void {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(cacheData))
    } catch (e) {
      console.error('Error saving to cache:', e)
    }
  }

  function clearCache(key: string): void {
    localStorage.removeItem(key)
  }

  return {
    getCached,
    setCache,
    clearCache,
    CACHE_KEY,
    CACHE_TIMESTAMP_KEY
  }
}

export function useProductosCache() {
  const { getCached, setCache, clearCache, CACHE_KEY } = useProductCache()
  
  function getProductosCache<T>(): T | null {
    return getCached<T>(CACHE_KEY)
  }
  
  function setProductosCache<T>(data: T): void {
    setCache(CACHE_KEY, data)
  }
  
  function clearProductosCache(): void {
    clearCache(CACHE_KEY)
  }
  
  return {
    getProductosCache,
    setProductosCache,
    clearProductosCache
  }
}
