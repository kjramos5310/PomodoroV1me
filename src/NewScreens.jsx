// ============= NEW NAVIGATION SCREENS =============

// PROJECTS SCREEN
function ProjectsScreen({ projects, currentProject, onSelectProject, onAddProject, onDeleteProject }) {
    const [showNewProject, setShowNewProject] = useState(false)
    const [newProjectName, setNewProjectName] = useState('')
    const [newProjectEmoji, setNewProjectEmoji] = useState('📁')

    const emojis = ['📚', '💻', '🎨', '🏋️', '🎵', '📝', '🔬', '📊', '🎯', '💡']

    const handleCreate = () => {
        if (!newProjectName.trim()) return

        const newProject = {
            id: Date.now().toString(),
            name: newProjectName,
            emoji: newProjectEmoji,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            createdAt: new Date().toISOString(),
            totalDeepworks: 0
        }

        onAddProject(newProject)
        setNewProjectName('')
        setNewProjectEmoji('📁')
        setShowNewProject(false)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen w-full pt-20 px-8 pb-8"
        >
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold">Proyectos</h1>
                    <button
                        onClick={() => setShowNewProject(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full font-semibold transition-colors"
                    >
                        <Plus size={20} />
                        Nuevo Proyecto
                    </button>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(project => (
                        <motion.button
                            key={project.id}
                            onClick={() => onSelectProject(project)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`p-6 rounded-2xl bg-neutral-850/50 hover:bg-neutral-850 transition-all text-left relative ${currentProject.id === project.id ? 'ring-2 ring-gold-500' : ''
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{project.emoji}</span>
                                    <div>
                                        <h3 className="text-xl font-semibold">{project.name}</h3>
                                        <p className="text-sm text-gray-400">
                                            {project.totalDeepworks} deepworks completados
                                        </p>
                                    </div>
                                </div>

                                {projects.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (confirm(`¿Eliminar proyecto "${project.name}"?`)) {
                                                onDeleteProject(project.id)
                                            }
                                        }}
                                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} className="text-red-400" />
                                    </button>
                                )}
                            </div>

                            {currentProject.id === project.id && (
                                <div className="mt-3 pt-3 border-t border-neutral-700">
                                    <span className="text-sm text-gold-500 font-medium">● Proyecto activo</span>
                                </div>
                            )}
                        </motion.button>
                    ))}
                </div>

                {/* New Project Modal */}
                <AnimatePresence>
                    {showNewProject && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 flex items-center justify-center p-8 z-50"
                            onClick={() => setShowNewProject(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.9 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-neutral-850 p-8 rounded-3xl max-w-md w-full"
                            >
                                <h3 className="text-2xl font-semibold mb-6">Nuevo Proyecto</h3>

                                {/* Emoji Selector */}
                                <div className="mb-6">
                                    <p className="text-sm text-gray-400 mb-3">Selecciona un emoji:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {emojis.map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => setNewProjectEmoji(emoji)}
                                                className={`text-3xl p-2 rounded-lg transition-all ${newProjectEmoji === emoji
                                                    ? 'bg-gold-500 scale-110'
                                                    : 'bg-neutral-900 hover:bg-neutral-800'
                                                    }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Name Input */}
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="Nombre del proyecto..."
                                    className="w-full p-4 bg-neutral-900 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 mb-6"
                                    autoFocus
                                />

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowNewProject(false)}
                                        className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full transition-colors font-semibold"
                                    >
                                        Crear
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

// HISTORY SCREEN
function HistoryScreen({ history }) {
    const groupedHistory = history.reduce((acc, entry) => {
        const date = new Date(entry.date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        if (!acc[date]) acc[date] = []
        acc[date].push(entry)
        return acc
    }, {})

    const moodEmojis = {
        bajo: '😴',
        neutro: '😐',
        ready: '🔥',
        flow: '🌀'
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen w-full pt-20 px-8 pb-8"
        >
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-8">Historial</h1>

                {history.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400 text-lg">No hay sesiones registradas aún</p>
                        <p className="text-gray-500 text-sm mt-2">Completa tu primer deepwork para verlo aquí </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedHistory).map(([date, entries]) => (
                            <div key={date}>
                                <h3 className="text-lg font-semibold text-gray-400 mb-4">{date}</h3>
                                <div className="space-y-4">
                                    {entries.map(entry => (
                                        <motion.div
                                            key={entry.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-neutral-850/50 p-6 rounded-2xl"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl">{moodEmojis[entry.mood]}</span>
                                                    <div>
                                                        <h4 className="font-semibold text-lg">{entry.projectName}</h4>
                                                        <p className="text-sm text-gray-400">
                                                            {new Date(entry.date).toLocaleTimeString('es-ES', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-gold-500">
                                                        {entry.deepworksCompleted}/{entry.deepworksPlanned}
                                                    </p>
                                                    <p className="text-xs text-gray-400">deepworks</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-400">Preguntas trabajadas</p>
                                                    <p className="font-medium">{entry.questions?.length || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400">Duración</p>
                                                    <p className="font-medium">{Math.floor(entry.duration / 60)}min</p>
                                                </div>
                                            </div>

                                            {entry.questions && entry.questions.length > 0 && (
                                                <details className="mt-4">
                                                    <summary className="cursor-pointer text-sm text-gold-500 hover:text-gold-400">
                                                        Ver preguntas
                                                    </summary>
                                                    <ul className="mt-2 space-y-1 text-sm text-gray-300 ml-4">
                                                        {entry.questions.map((q, i) => (
                                                            <li key={i}>• {q}</li>
                                                        ))}
                                                    </ul>
                                                </details>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// METRICS SCREEN
function MetricsScreen({ history, projects }) {
    const [activeTab, setActiveTab] = useState('weekly')

    // ── Streak calculation ──────────────────────────────────────────
    const calcStreak = () => {
        if (history.length === 0) return { current: 0, best: 0 }

        // Unique session dates sorted descending
        const dates = [...new Set(history.map(e => e.date.split('T')[0]))].sort((a, b) => b.localeCompare(a))

        let current = 0
        let best = 0
        let streak = 1
        const today = new Date().toISOString().split('T')[0]

        // Check if today or yesterday has a session (streak still alive)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        if (dates[0] !== today && dates[0] !== yesterdayStr) {
            current = 0
        } else {
            current = 1
            for (let i = 1; i < dates.length; i++) {
                const prev = new Date(dates[i - 1])
                const curr = new Date(dates[i])
                const diff = (prev - curr) / (1000 * 60 * 60 * 24)
                if (diff === 1) { current++; streak++ } else break
            }
        }

        // Best streak
        streak = 1
        for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1])
            const curr = new Date(dates[i])
            const diff = (prev - curr) / (1000 * 60 * 60 * 24)
            if (diff === 1) { streak++ } else { best = Math.max(best, streak); streak = 1 }
        }
        best = Math.max(best, streak, current)

        return { current, best }
    }

    const { current: currentStreak, best: bestStreak } = calcStreak()

    // ── Tab data ────────────────────────────────────────────────────
    const getDays = (n) => Array.from({ length: n }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (n - 1 - i))
        return d.toISOString().split('T')[0]
    })

    const tabConfig = {
        daily: { days: getDays(1), labelFn: () => 'Hoy', slots: 24, unit: 'h' },
        weekly: { days: getDays(7), labelFn: d => new Date(d + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short' }), slots: 7, unit: 'd' },
        monthly: { days: getDays(30), labelFn: d => new Date(d + 'T12:00').getDate(), slots: 30, unit: 'd' }
    }

    const tab = tabConfig[activeTab]

    const chartData = tab.days.map(date => {
        const entries = history.filter(e => e.date.startsWith(date))
        return {
            label: tab.labelFn(date),
            deepworks: entries.reduce((s, e) => s + e.deepworksCompleted, 0),
            minutes: Math.round(entries.reduce((s, e) => s + e.duration, 0) / 60)
        }
    })

    const maxDW = Math.max(...chartData.map(d => d.deepworks), 1)

    // ── Key metrics ─────────────────────────────────────────────────
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const byDay = Array(7).fill(0)
    history.forEach(e => { byDay[new Date(e.date).getDay()] += e.deepworksCompleted })
    const mostProductiveDay = dayNames[byDay.indexOf(Math.max(...byDay))]
    const leastProductiveDay = dayNames[byDay.indexOf(Math.min(...byDay.filter(v => v > 0)))] || '—'

    const byHour = Array(24).fill(0)
    history.forEach(e => { byHour[new Date(e.date).getHours()] += e.deepworksCompleted })
    const peakHour = byHour.indexOf(Math.max(...byHour))
    const mostActiveTime = peakHour < 12 ? 'Mañana' : peakHour < 18 ? 'Tarde' : 'Noche'

    const totalMinutes = history.reduce((s, e) => s + e.duration, 0) / 60
    const uniqueDays = new Set(history.map(e => e.date.split('T')[0])).size
    const avgDailyMinutes = uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0
    const avgH = Math.floor(avgDailyMinutes / 60)
    const avgM = avgDailyMinutes % 60

    // ── Focus timeline SVG ──────────────────────────────────────────
    const svgW = 300, svgH = 80
    const points = chartData.map((d, i) => {
        const x = chartData.length > 1 ? (i / (chartData.length - 1)) * svgW : svgW / 2
        const y = svgH - (d.deepworks / maxDW) * (svgH - 8) - 4
        return `${x},${y}`
    }).join(' ')

    const areaPoints = chartData.length > 1
        ? `0,${svgH} ${points} ${svgW},${svgH}`
        : `0,${svgH} ${svgW / 2},${svgH - (chartData[0]?.deepworks / maxDW) * (svgH - 8) - 4} ${svgW},${svgH}`

    // ── Labels for x-axis (show only a few) ────────────────────────
    const xLabels = chartData.length <= 7
        ? chartData
        : chartData.filter((_, i) => i % Math.ceil(chartData.length / 6) === 0 || i === chartData.length - 1)

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen w-full pt-20 px-4 pb-8"
        >
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold mb-6 px-4">Métricas</h1>

                {/* ── STREAK ── */}
                <div className="bg-neutral-900 rounded-2xl p-5 mb-4 mx-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Racha</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🔥</span>
                            <div>
                                <p className="text-xs text-gray-400">Racha actual</p>
                                <p className="text-2xl font-bold">{currentStreak} <span className="text-sm font-normal text-gray-400">días</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🏆</span>
                            <div>
                                <p className="text-xs text-gray-400">Mejor racha</p>
                                <p className="text-2xl font-bold">{bestStreak} <span className="text-sm font-normal text-gray-400">días</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TABS ── */}
                <div className="flex mx-4 mb-4 bg-neutral-900 rounded-xl p-1">
                    {[['daily', 'Diario'], ['weekly', 'Semanal'], ['monthly', 'Mensual']].map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === id
                                ? 'bg-neutral-700 text-white'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── KEY METRICS ── */}
                <div className="bg-neutral-900 rounded-2xl p-5 mb-4 mx-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Métricas clave</p>
                    <div className="space-y-4">
                        {[
                            { icon: '📈', color: 'bg-green-900/40', label: 'Día más productivo', value: history.length ? mostProductiveDay : '—' },
                            { icon: '📉', color: 'bg-red-900/40', label: 'Día menos productivo', value: history.length ? leastProductiveDay : '—' },
                            { icon: '⏰', color: 'bg-yellow-900/40', label: 'Hora más activa', value: history.length ? mostActiveTime : '—' },
                            { icon: '📊', color: 'bg-blue-900/40', label: 'Focus diario promedio', value: history.length ? `${avgH}h ${avgM}m` : '—' },
                        ].map(({ icon, color, label, value }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-lg flex-shrink-0`}>
                                    {icon}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400">{label}</p>
                                    <p className="font-semibold">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── FOCUS TIMELINE ── */}
                <div className="bg-neutral-900 rounded-2xl p-5 mb-4 mx-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Timeline de focus</p>

                    {history.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-8">Completa tu primer deepwork para ver datos</p>
                    ) : (
                        <>
                            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="none" style={{ height: 100 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
                                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
                                    </linearGradient>
                                </defs>
                                {/* Grid lines */}
                                {[0.25, 0.5, 0.75].map(f => (
                                    <line key={f} x1="0" y1={svgH * f} x2={svgW} y2={svgH * f}
                                        stroke="#374151" strokeWidth="0.5" strokeDasharray="4 4" />
                                ))}
                                {/* Area fill */}
                                <polygon points={areaPoints} fill="url(#areaGrad)" />
                                {/* Line */}
                                <polyline points={points} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                {/* Dots */}
                                {chartData.map((d, i) => {
                                    const x = chartData.length > 1 ? (i / (chartData.length - 1)) * svgW : svgW / 2
                                    const y = svgH - (d.deepworks / maxDW) * (svgH - 8) - 4
                                    return d.deepworks > 0
                                        ? <circle key={i} cx={x} cy={y} r="3" fill="#F59E0B" />
                                        : null
                                })}
                            </svg>

                            {/* X-axis labels */}
                            <div className="flex justify-between mt-2">
                                {xLabels.map((d, i) => (
                                    <span key={i} className="text-xs text-gray-500 capitalize">{d.label}</span>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── PROJECT STATS ── */}
                <div className="bg-neutral-900 rounded-2xl p-5 mx-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Proyectos</p>
                    {projects.length === 0 ? (
                        <p className="text-gray-500 text-sm">Sin proyectos aún</p>
                    ) : (
                        <div className="space-y-4">
                            {[...projects]
                                .sort((a, b) => b.totalDeepworks - a.totalDeepworks)
                                .map(project => {
                                    const maxDWP = Math.max(...projects.map(p => p.totalDeepworks), 1)
                                    return (
                                        <div key={project.id} className="flex items-center gap-3">
                                            <span className="text-2xl">{project.emoji}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <p className="text-sm font-medium">{project.name}</p>
                                                    <p className="text-sm font-bold text-gold-500">{project.totalDeepworks}</p>
                                                </div>
                                                <div className="w-full bg-neutral-800 rounded-full h-1.5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(project.totalDeepworks / maxDWP) * 100}%` }}
                                                        transition={{ duration: 0.6 }}
                                                        className="bg-gold-500 h-1.5 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

// Stats Card Component (kept for compatibility)
function StatsCard({ icon, value, label, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-850/50 p-6 rounded-2xl"
        >
            <div className={`${color} mb-3`}>{icon}</div>
            <div className="text-4xl font-bold mb-1">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </motion.div>
    )
}








