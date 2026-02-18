import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, Plus, Check, Download, Sparkles, Menu, X, Folder, History, BarChart3, ChevronDown, Trash2 } from 'lucide-react'
import './index.css'

// ============= MAIN APP COMPONENT =============
function App() {
    // Estado global de la aplicación - DeepWork Flow
    const [screen, setScreen] = useState('hero')
    const [mood, setMood] = useState(null)
    const [deepworkCount, setDeepworkCount] = useState(1)
    const [currentDeepwork, setCurrentDeepwork] = useState(1)
    const [questions, setQuestions] = useState([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [completedQuestions, setCompletedQuestions] = useState([])
    const [logs, setLogs] = useState([])
    const [sessionData, setSessionData] = useState({})
    const [synthesisData, setSynthesisData] = useState({})
    const [evidenceData, setEvidenceData] = useState({})

    // Estado - Proyectos y Navegación
    const [projects, setProjects] = useState([
        { id: '1', name: 'Estudio', emoji: '📚', color: '#3B82F6', createdAt: new Date().toISOString(), totalDeepworks: 0 }
    ])
    const [currentProject, setCurrentProject] = useState(projects[0])
    const [history, setHistory] = useState([])
    const [showSidebar, setShowSidebar] = useState(false)
    const [navigationScreen, setNavigationScreen] = useState(null) // 'projects', 'history', 'metrics', null
    const [showProjectSelector, setShowProjectSelector] = useState(false)

    // Sistema de logging
    const addLog = (eventType, data) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event_type: eventType,
            data: data
        }
        setLogs(prev => [...prev, logEntry])
        console.log('Log added:', logEntry)
    }

    // Exportar logs
    const exportLogs = () => {
        const dataStr = JSON.stringify(logs, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `deepwork-logs-${new Date().toISOString().split('T')[0]}.json`
        link.click()
    }

    // Guardar sesión completada al historial
    const saveToHistory = () => {
        const historyEntry = {
            id: Date.now().toString(),
            projectId: currentProject.id,
            projectName: currentProject.name,
            date: new Date().toISOString(),
            mood: mood,
            deepworksCompleted: currentDeepwork,
            deepworksPlanned: deepworkCount,
            duration: sessionData.duration || 0,
            questions: questions,
            synthesis: synthesisData,
            evidence: evidenceData
        }
        setHistory(prev => [historyEntry, ...prev])

        // Actualizar total de deepworks del proyecto
        setProjects(prev => prev.map(p =>
            p.id === currentProject.id
                ? { ...p, totalDeepworks: p.totalDeepworks + 1 }
                : p
        ))
    }

    // Configuraciones según mood
    const moodConfigs = {
        bajo: { suggested: 1, warmupTime: 120, focusTime: 900 }, // 2min, 15min
        neutro: { suggested: 2, warmupTime: 120, focusTime: 1500 }, // 2min, 25min
        ready: { suggested: 3, warmupTime: 120, focusTime: 1500 }, // 2min, 25min
        flow: { suggested: 5, warmupTime: 120, focusTime: 2700 } // 2min, 45min
    }

    // Determinar si mostramos el header (no en flujo de deepwork principal)
    const isInDeepworkFlow = screen !== 'hero' && !navigationScreen
    const showHeader = navigationScreen || screen === 'hero'

    return (
        <div className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
            {/* Header - Solo en pantallas de navegación */}
            {showHeader && (
                <Header
                    currentProject={currentProject}
                    projects={projects}
                    showProjectSelector={showProjectSelector}
                    setShowProjectSelector={setShowProjectSelector}
                    setCurrentProject={setCurrentProject}
                    onMenuClick={() => setShowSidebar(true)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                show={showSidebar}
                onClose={() => setShowSidebar(false)}
                onNavigate={(screen) => {
                    setNavigationScreen(screen)
                    setShowSidebar(false)
                }}
                currentScreen={navigationScreen}
            />

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {/* Navigation Screens */}
                {navigationScreen === 'projects' && (
                    <ProjectsScreen
                        key="projects"
                        projects={projects}
                        currentProject={currentProject}
                        onSelectProject={(project) => {
                            setCurrentProject(project)
                            setNavigationScreen(null)
                        }}
                        onAddProject={(project) => {
                            setProjects(prev => [...prev, project])
                        }}
                        onDeleteProject={(projectId) => {
                            setProjects(prev => prev.filter(p => p.id !== projectId))
                            if (currentProject.id === projectId && projects.length > 1) {
                                setCurrentProject(projects.find(p => p.id !== projectId))
                            }
                        }}
                    />
                )}

                {navigationScreen === 'history' && (
                    <HistoryScreen
                        key="history"
                        history={history}
                    />
                )}

                {navigationScreen === 'metrics' && (
                    <MetricsScreen
                        key="metrics"
                        history={history}
                        projects={projects}
                    />
                )}

                {/* DeepWork Flow Screens */}
                {!navigationScreen && (
                    <>
                        {screen === 'hero' && (
                            <HeroScreen
                                key="hero"
                                onStart={() => {
                                    setScreen('mood')
                                    addLog('session_start', { timestamp: new Date().toISOString() })
                                }}
                            />
                        )}

                        {screen === 'mood' && (
                            <MoodScreen
                                key="mood"
                                onSelectMood={(selectedMood) => {
                                    setMood(selectedMood)
                                    setDeepworkCount(moodConfigs[selectedMood].suggested)
                                    addLog('mood_set', { mood: selectedMood })
                                    setScreen('config')
                                }}
                            />
                        )}

                        {screen === 'config' && (
                            <DeepworkConfigScreen
                                key="config"
                                mood={mood}
                                suggestedCount={moodConfigs[mood].suggested}
                                onStart={(count) => {
                                    setDeepworkCount(count)
                                    setScreen('warmup')
                                }}
                            />
                        )}

                        {screen === 'warmup' && (
                            <WarmUpScreen
                                key="warmup"
                                mood={mood}
                                currentDeepwork={currentDeepwork}
                                totalDeepworks={deepworkCount}
                                duration={moodConfigs[mood].warmupTime}
                                onComplete={() => {
                                    addLog('warmup_complete', {
                                        duration_seconds: moodConfigs[mood].warmupTime,
                                        deepwork_number: currentDeepwork
                                    })
                                    setScreen('questions')
                                }}
                            />
                        )}

                        {screen === 'questions' && (
                            <QuestionsScreen
                                key="questions"
                                onStart={(questionsList) => {
                                    setQuestions(questionsList)
                                    setCurrentQuestionIndex(0)
                                    setCompletedQuestions([])
                                    setScreen('focus')
                                }}
                            />
                        )}

                        {screen === 'focus' && (
                            <FocusScreen
                                key="focus"
                                mood={mood}
                                duration={moodConfigs[mood].focusTime}
                                questions={questions}
                                currentQuestionIndex={currentQuestionIndex}
                                completedQuestions={completedQuestions}
                                onAddQuestion={(newQuestion) => {
                                    setQuestions(prev => [...prev, newQuestion])
                                }}
                                onCompleteQuestion={() => {
                                    setCompletedQuestions(prev => [...prev, currentQuestionIndex])
                                    if (currentQuestionIndex < questions.length - 1) {
                                        setCurrentQuestionIndex(prev => prev + 1)
                                    }
                                }}
                                onComplete={(sessionInfo) => {
                                    addLog('focus_complete', {
                                        questions_answered: completedQuestions.length,
                                        duration: moodConfigs[mood].focusTime
                                    })
                                    setSessionData(sessionInfo)
                                    setScreen('synthesis')
                                }}
                            />
                        )}

                        {screen === 'synthesis' && (
                            <SynthesisScreen
                                key="synthesis"
                                onNext={(data) => {
                                    setSynthesisData(data)
                                    setScreen('evidence')
                                }}
                            />
                        )}

                        {screen === 'evidence' && (
                            <EvidenceScreen
                                key="evidence"
                                onNext={(data) => {
                                    setEvidenceData(data)
                                    addLog('evidence_added', {
                                        type: data.type,
                                        content_preview: data.content?.substring(0, 50)
                                    })
                                    saveToHistory() // Guardar al historial
                                    setScreen('completed')
                                }}
                            />
                        )}

                        {screen === 'completed' && (
                            <CompletedScreen
                                key="completed"
                                currentDeepwork={currentDeepwork}
                                totalDeepworks={deepworkCount}
                                sessionData={sessionData}
                                logs={logs}
                                onNextDeepwork={() => {
                                    setCurrentDeepwork(prev => prev + 1)
                                    setScreen('warmup')
                                }}
                                onAddExtraDeepwork={() => {
                                    setDeepworkCount(prev => prev + 1)
                                    setCurrentDeepwork(prev => prev + 1)
                                    setScreen('warmup')
                                }}
                                onFinishDay={() => {
                                    // Reset para volver al inicio
                                    setScreen('hero')
                                    setCurrentDeepwork(1)
                                    setMood(null)
                                }}
                                onExportLogs={exportLogs}
                            />
                        )}
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

// ============= HEADER COMPONENT =============
function Header({ currentProject, projects, showProjectSelector, setShowProjectSelector, setCurrentProject, onMenuClick }) {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800">
            <div className="flex items-center justify-between p-4">
                {/* Hamburger Menu */}
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>

                {/* Project Selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowProjectSelector(!showProjectSelector)}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-850 rounded-xl hover:bg-neutral-800 transition-colors"
                    >
                        <span className="text-2xl">{currentProject.emoji}</span>
                        <span className="font-medium">{currentProject.name}</span>
                        < ChevronDown size={18} className={`transition-transform ${showProjectSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                        {showProjectSelector && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full mt-2 left-0 right-0 bg-neutral-850 rounded-xl overflow-hidden border border-neutral-700 min-w-[200px]"
                            >
                                {projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setCurrentProject(project)
                                            setShowProjectSelector(false)
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors ${currentProject.id === project.id ? 'bg-neutral-800' : ''
                                            }`}
                                    >
                                        <span className="text-xl">{project.emoji}</span>
                                        <span>{project.name}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="w-10" />
            </div>
        </div>
    )
}

// ============= SIDEBAR COMPONENT =============
function Sidebar({ show, onClose, onNavigate, currentScreen }) {
    const menuItems = [
        { id: 'projects', icon: Folder, label: 'Proyectos' },
        { id: 'history', icon: History, label: 'Historial' },
        { id: 'metrics', icon: BarChart3, label: 'Métricas' }
    ]

    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-40"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-72 bg-neutral-900 z-50 border-r border-neutral-800"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">DeepWork</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="p-4">
                            {menuItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onNavigate(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-2 ${currentScreen === item.id
                                            ? 'bg-gold-500 text-black'
                                            : 'hover:bg-neutral-800'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-neutral-800">
                            <p className="text-sm text-gray-400 text-center">Optimizado para TDAH ✨</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default App
