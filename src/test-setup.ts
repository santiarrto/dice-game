import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const storageData = new Map<string, string>()

Object.defineProperties(Storage.prototype, {
  length: {
    configurable: true,
    get: () => storageData.size,
  },
  clear: {
    configurable: true,
    value: () => storageData.clear(),
  },
  getItem: {
    configurable: true,
    value: (key: string) => storageData.get(String(key)) ?? null,
  },
  key: {
    configurable: true,
    value: (index: number) => [...storageData.keys()][index] ?? null,
  },
  removeItem: {
    configurable: true,
    value: (key: string) => storageData.delete(String(key)),
  },
  setItem: {
    configurable: true,
    value: (key: string, value: string) => storageData.set(String(key), String(value)),
  },
})

const localStorage = Object.create(Storage.prototype) as Storage

Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage })
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: localStorage })

afterEach(cleanup)
