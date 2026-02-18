import { useState, useEffect } from 'react'

/**
 * Hook que sincroniza estado de React con localStorage.
 * Los datos persisten entre recargas de página (F5).
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key)
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            console.warn(`useLocalStorage: error reading key "${key}"`, error)
            return initialValue
        }
    })

    const setValue = (value) => {
        try {
            // Permite pasar una función igual que useState
            const valueToStore = value instanceof Function ? value(storedValue) : value
            setStoredValue(valueToStore)
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
        } catch (error) {
            console.warn(`useLocalStorage: error writing key "${key}"`, error)
        }
    }

    return [storedValue, setValue]
}
