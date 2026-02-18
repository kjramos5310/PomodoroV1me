import { useState, useEffect } from 'react'

/**
 * Hook que carga la configuración de la app desde /public/data/config.json
 * Permite editar el JSON sin tocar el código fuente.
 */
export function useAppData() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch('/data/config.json')
            .then(res => {
                if (!res.ok) throw new Error(`Error al cargar config: ${res.status}`)
                return res.json()
            })
            .then(json => {
                // Añadir createdAt a los proyectos iniciales si no lo tienen
                const projects = json.initialProjects.map(p => ({
                    ...p,
                    createdAt: p.createdAt || new Date().toISOString()
                }))
                setData({ ...json, initialProjects: projects })
                setLoading(false)
            })
            .catch(err => {
                console.error('useAppData error:', err)
                setError(err.message)
                setLoading(false)
            })
    }, [])

    return { data, loading, error }
}
