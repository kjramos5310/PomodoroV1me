import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, Plus, Check, Download, Sparkles, Menu, X, Folder, History, BarChart3, ChevronDown, Trash2 } from 'lucide-react'
import { useAppData } from './hooks/useAppData'
import { useLocalStorage } from './hooks/useLocalStorage'
import './index.css'

// ============= MAIN APP COMPONENT =============
function App() {
  // Cargar configuración desde JSON externo
  const { data: config, loading: configLoading, error: configError } = useAppData()

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

  // Estado - Proyectos y Navegación (persistido en localStorage)
  const [projects, setProjects] = useLocalStorage('dw_projects', [])
  const [currentProject, setCurrentProject] = useLocalStorage('dw_current_project', null)
  const [history, setHistory] = useLocalStorage('dw_history', [])

  // Inicializar proyectos desde config.json solo si localStorage está vacío
  useEffect(() => {
    if (config && projects.length === 0) {
      setProjects(config.initialProjects)
      setCurrentProject(config.initialProjects[0])
    }
  }, [config])
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

  // Importar logs
  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result)

        let newHistory = []
        let newProjects = []

        // Soporte para nuevo formato { history, projects }
        if (importedData.history && importedData.projects) {
          newHistory = importedData.history
          newProjects = importedData.projects
        }
        // Soporte legacy (array directo de history)
        else if (Array.isArray(importedData)) {
          newHistory = importedData
        }
        else {
          // Soporte legacy (objeto único)
          newHistory = [importedData]
        }

        // Filtrar entradas de historial inválidas
        const validHistory = newHistory.filter(entry => entry.id && entry.date && entry.projectId)

        if (validHistory.length === 0 && newProjects.length === 0) {
          alert('No se encontraron datos válidos en el archivo.')
          return
        }

        // 1. Fusionar historial evitando duplicados
        let newEntriesCount = 0
        setHistory(prev => {
          const existingIds = new Set(prev.map(e => e.id))
          const newEntries = validHistory.filter(e => !existingIds.has(e.id))
          newEntriesCount = newEntries.length
          return [...newEntries, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date))
        })

        // 2. Fusionar proyectos (prioridad a los importados si son más recientes o si no existen)
        let newProjectsCount = 0
        setProjects(prevProjects => {
          // Crear mapa de proyectos existentes
          const projectMap = new Map(prevProjects.map(p => [p.id, p]))

          // A. Agregar proyectos explícitos del backup
          newProjects.forEach(p => {
            if (!projectMap.has(p.id)) {
              projectMap.set(p.id, p)
              newProjectsCount++
            } else {
              // Si existe, podríamos fusionar stats. Por ahora, priorizamos el local salvo que el importado tenga más deepworks
              const existing = projectMap.get(p.id)
              if (p.totalDeepworks > existing.totalDeepworks) {
                projectMap.set(p.id, { ...existing, ...p })
              }
            }
          })

          // B. Recrear proyectos faltantes desde el historial (si no vinieron en projects)
          validHistory.forEach(entry => {
            if (!projectMap.has(entry.projectId)) {
              const newProject = {
                id: entry.projectId,
                name: entry.projectName || 'Proyecto Restaurado',
                emoji: entry.projectEmoji || '📁',
                focus: entry.projectFocus || '',
                createdAt: entry.date,
                totalDeepworks: 1,
                status: 'in_progress',
                plannedDays: 7,
                hoursGoal: 10,
                hoursLogged: entry.duration ? entry.duration / 3600 : 0
              }
              projectMap.set(entry.projectId, newProject)
              newProjectsCount++
            }
          })

          return Array.from(projectMap.values())
        })

        alert(`Importación completada:\n- ${newEntriesCount} sesiones añadidas\n- ${newProjectsCount} proyectos sincronizados`)
      } catch (err) {
        console.error('Error importando:', err)
        alert('Error al leer el archivo JSON')
      }
    }
    reader.readAsText(file)
  }

  // Guardar sesión completada al historial
  const saveToHistory = () => {
    const historyEntry = {
      id: Date.now().toString(),
      projectId: currentProject.id,
      projectName: currentProject.name,
      projectEmoji: currentProject.emoji,
      projectFocus: currentProject.focus,
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

  // Configuraciones desde config.json (con fallback por si no cargó)
  const moodConfigs = config?.moodConfigs ?? {
    bajo: { suggested: 1, warmupTime: 120, focusTime: 900 },
    neutro: { suggested: 2, warmupTime: 120, focusTime: 1500 },
    ready: { suggested: 3, warmupTime: 120, focusTime: 1500 },
    flow: { suggested: 5, warmupTime: 120, focusTime: 2700 }
  }

  // Determinar si mostramos el header
  const isInDeepworkFlow = screen !== 'hero' && !navigationScreen
  const showHeader = navigationScreen || screen === 'hero'

  // Pantalla de carga mientras se obtiene config.json
  if (configLoading || !currentProject) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-2 border-gold-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (configError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-neutral-950 px-8">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-2">Error al cargar configuración</p>
          <p className="text-gray-500 text-sm">{configError}</p>
          <p className="text-gray-600 text-xs mt-4">Verifica que existe /public/data/config.json</p>
        </div>
      </div>
    )
  }

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
            history={history}
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
            projects={projects}
            onImport={handleImport}
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
                moods={config?.moods}
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
                moodColors={config?.moodColors}
                countOptions={config?.deepworkCountOptions}
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

// ============= SCREEN COMPONENTS =============

// 1. HERO SCREEN
function HeroScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950"
    >
      <div className="text-center">
        <motion.button
          onClick={onStart}
          className="relative w-64 h-64 rounded-full overflow-hidden cursor-pointer"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          <img
            src="https://i.pinimg.com/originals/57/52/1e/57521e44486b536872c9416c465e9079.gif"
            alt="Iniciar"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 rounded-full ring-2 ring-gold-500/60 hover:ring-gold-400 transition-all" />
        </motion.button>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-gray-400 text-sm"
        >
          Toca para comenzar tu sesión
        </motion.p>
      </div>
    </motion.div>
  )
}

// 2. MOOD SCREEN
function MoodScreen({ onSelectMood, moods }) {
  const [selected, setSelected] = useState(null)

  // Fallback si no llegan props
  const moodList = moods ?? [
    { id: 'bajo', emoji: '😴', label: 'Bajo' },
    { id: 'neutro', emoji: '😐', label: 'Neutro' },
    { id: 'ready', emoji: '🔥', label: 'Ready' },
    { id: 'flow', emoji: '🌀', label: 'Flow' },
  ]

  const handleSelect = (moodId) => {
    setSelected(moodId)
    setTimeout(() => {
      onSelectMood(moodId)
    }, 300)
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl font-semibold mb-4">¿Cómo estás hoy?</h2>
        <p className="text-gray-400 text-sm">Sé honesto, no hay respuesta incorrecta</p>
      </motion.div>

      <div className="flex gap-6 flex-wrap justify-center max-w-2xl">
        {moodList.map((mood, index) => (
          <motion.button
            key={mood.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: selected && selected !== mood.id ? 0.4 : 1,
              scale: selected === mood.id ? 1.15 : 1
            }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: selected ? 1 : 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(mood.id)}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-neutral-850/50 backdrop-blur-sm hover:bg-neutral-850 transition-colors min-w-[140px]"
          >
            <span className="text-6xl">{mood.emoji}</span>
            <span className="text-white font-medium">{mood.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// 3. DEEPWORK CONFIG SCREEN
function DeepworkConfigScreen({ mood, suggestedCount, onStart, moodColors, countOptions }) {
  const [count, setCount] = useState(suggestedCount)

  const options = countOptions ?? [1, 2, 3, 4, 5, 6]

  // 🎞️ Pon aquí tus links de GIFs para cada número de deepworks
  const gifsByCount = {
    1: 'https://i.pinimg.com/originals/b3/0a/b3/b30ab33eb2d57ca6cfe93059c830fc58.gif', // reemplaza con tu link
    2: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGd6MTN2enQ1dGlvNG9nZHBxazI5cGhmMzNlZG02cXhhbmh3djNnNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/hP9gy6aTMyle7e5pbS/giphy.gif',
    3: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm45ODN2a2ZxdDRoaGE4NmUxM2w4OTh1cnQ3dzNvazczNWkzNGE2MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/2vkmQBB91NUTolPSd2/giphy.gif',
    4: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXg3a2kyMmg1NjZsM3ByZjlsbmlzajZsdmszaWZrbWhhZWNvZ2hiayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/K91OXsr6lSjh5qxQBb/giphy.gif',
    5: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWM3NXQ4aHlzZHJxcmFvcGR5bWY3cHozdWNnMnJsb25sOXMzeWNhcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/KqOmIBTRF7RHwvGJqA/giphy.gif',
    6: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWgwcWJmaXJsOXNybzN4cGJuZWpqZmhyaTc0eXp5bnhjbXUxZWRmOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RDen1HUlEWp6OKS15E/giphy.gif',
  }

  const currentGif = gifsByCount[count] || gifsByCount[1]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8"
    >
      {/* GIF */}
      <motion.div
        key={count}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-64 h-64 rounded-3xl overflow-hidden mb-10 bg-neutral-800 shadow-2xl"
      >
        <img
          src={currentGif}
          alt={`${count} deepworks`}
          className="w-full h-full object-cover"
        />
      </motion.div>

      <div className="text-center max-w-md w-full">
        <h2 className="text-3xl font-semibold mb-4">¿Cuántos deepworks hoy?</h2>
        <p className="text-gray-400 text-sm mb-8">Sugerido: {suggestedCount} según tu energía</p>

        {/* Slider */}
        <div className="mb-12">
          <div className="flex justify-center gap-3 mb-6">
            {options.map((num) => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${count === num
                  ? 'bg-gold-500 text-black scale-110'
                  : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                  }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStart(count)}
          className="w-full max-w-xs py-4 px-8 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-full text-lg transition-colors"
        >
          CALENTAR
        </motion.button>
      </div>
    </motion.div>
  )
}

// 4. WARM-UP SCREEN
function WarmUpScreen({ mood, currentDeepwork, totalDeepworks, duration, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (timeLeft <= 0) {
      setShowConfetti(true)
      setTimeout(onComplete, 1500)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onComplete])

  const progress = ((duration - timeLeft) / duration) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-700/20 animate-pulse" />
        <div className="text-center">
          <p className="text-gray-400 text-sm">Deepwork {currentDeepwork} de {totalDeepworks}</p>
          <p className="text-white font-medium">Warm-up</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Timer */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <motion.div className="relative">
          {/* Progress Ring */}
          <svg className="w-80 h-80 transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="140"
              stroke="#374151"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="160"
              cy="160"
              r="140"
              stroke="#F59E0B"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 880 }}
              animate={{ strokeDashoffset: 880 - (880 * progress) / 100 }}
              style={{ strokeDasharray: 880 }}
              transition={{ duration: 1 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl font-bold">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-gray-400 text-center max-w-md"
        >
          Escaneando... sin presión de entender
        </motion.p>
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: '50vw', y: '50vh', opacity: 1 }}
              animate={{
                x: Math.random() * window.innerWidth,
                y: -100,
                opacity: 0,
                rotate: 720
              }}
              transition={{ duration: 1, delay: i * 0.05 }}
              className="absolute w-4 h-4 bg-gold-500 rounded-full"
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

// 5. QUESTIONS SCREEN
function QuestionsScreen({ onStart }) {
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [q3, setQ3] = useState('')

  const handleStart = () => {
    const questions = [q1, q2, q3].filter(q => q.trim() !== '')
    if (questions.length === 0) {
      alert('Agrega al menos una pregunta')
      return
    }
    onStart(questions)
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="min-h-screen w-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8 py-12"
    >
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-semibold mb-2">¿Qué preguntas te surgieron?</h2>
          <p className="text-gray-400 text-sm">En el warm-up, ¿qué te llamó la atención?</p>
        </motion.div>

        <div className="space-y-6 flex-1">
          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            type="text"
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            placeholder="Pregunta 1..."
            className="w-full p-5 bg-neutral-850/50 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 transition-colors text-lg"
          />
          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            type="text"
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
            placeholder="Pregunta 2 (opcional)..."
            className="w-full p-5 bg-neutral-850/50 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 transition-colors text-lg"
          />
          <motion.input
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            type="text"
            value={q3}
            onChange={(e) => setQ3(e.target.value)}
            placeholder="Pregunta 3 (opcional)..."
            className="w-full p-5 bg-neutral-850/50 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 transition-colors text-lg"
          />
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          className="w-full py-5 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-full text-lg transition-colors mt-8"
        >
          INICIAR FOCUS
        </motion.button>
      </div>
    </motion.div>
  )
}

// 6. FOCUS SCREEN
function FocusScreen({ mood, duration, questions, currentQuestionIndex, completedQuestions, onAddQuestion, onCompleteQuestion, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const startTime = useRef(Date.now())

  useEffect(() => {
    if (timeLeft <= 0 || completedQuestions.length === questions.length) {
      onComplete({
        duration: duration - timeLeft,
        questionsAnswered: completedQuestions.length
      })
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, completedQuestions, questions, duration, onComplete])

  const progress = ((duration - timeLeft) / duration) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      onAddQuestion(newQuestion)
      setNewQuestion('')
      setShowAddQuestion(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-700/20 animate-pulse" />
        <div className="text-center">
          <p className="text-white font-medium">Focus Session</p>
          <p className="text-gray-400 text-sm">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center px-8 py-8">
        <div className="relative mb-8">
          <svg className="w-64 h-64 transform -rotate-90">
            <circle cx="128" cy="128" r="110" stroke="#374151" strokeWidth="6" fill="none" />
            <motion.circle
              cx="128" cy="128" r="110" stroke="#F59E0B" strokeWidth="6" fill="none"
              strokeLinecap="round"
              style={{ strokeDasharray: 691, strokeDashoffset: 691 - (691 * progress) / 100 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Current Question */}
        <div className="bg-neutral-850/50 backdrop-blur-sm p-8 rounded-3xl max-w-2xl w-full mb-8">
          <h3 className="text-2xl font-medium text-center">
            {questions[currentQuestionIndex]}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowAddQuestion(true)}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
          >
            <Plus size={20} />
            <span>Nueva pregunta</span>
          </button>
          <button
            onClick={onCompleteQuestion}
            disabled={completedQuestions.includes(currentQuestionIndex)}
            className="flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={20} />
            <span>Completé esto</span>
          </button>
        </div>
      </div>

      {/* Add Question Modal */}
      <AnimatePresence>
        {showAddQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-8 z-50"
            onClick={() => setShowAddQuestion(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-850 p-8 rounded-3xl max-w-md w-full"
            >
              <h3 className="text-2xl font-semibold mb-4">Nueva pregunta</h3>
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="¿Qué quieres investigar?"
                className="w-full p-4 bg-neutral-900 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddQuestion(false)}
                  className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full transition-colors"
                >
                  Agregar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// 7. SYNTHESIS SCREEN (Feynman)
function SynthesisScreen({ onNext }) {
  const [explanation, setExplanation] = useState('')
  const [stuckOn, setStuckOn] = useState([])

  const toggleStuck = (part) => {
    setStuckOn(prev =>
      prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
    )
  }

  const handleNext = () => {
    if (!explanation.trim()) {
      alert('Escribe tu explicación')
      return
    }
    onNext({ explanation, stuckOn })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8 py-12"
    >
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-semibold mb-2">Explícalo como si fuera a un niño</h2>
          <p className="text-gray-400 text-sm">Método Feynman: simplifica al máximo</p>
        </motion.div>

        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="¿Qué aprendiste? Explícalo con tus propias palabras..."
          className="w-full flex-1 min-h-[300px] p-6 bg-neutral-850/50 border border-neutral-700 rounded-3xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 transition-colors resize-none mb-8"
        />

        <div className="mb-8">
          <p className="text-lg font-medium mb-4">¿Dónde te trabaste?</p>
          <div className="flex gap-4 flex-wrap">
            {['Parte A', 'Parte B', 'Todo bien'].map((part) => (
              <button
                key={part}
                onClick={() => toggleStuck(part)}
                className={`px-6 py-3 rounded-full transition-all ${stuckOn.includes(part)
                  ? 'bg-gold-500 text-black'
                  : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'
                  }`}
              >
                {stuckOn.includes(part) && <Check className="inline mr-2" size={18} />}
                {part}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="w-full py-5 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-full text-lg transition-colors"
        >
          Siguiente
        </motion.button>
      </div>
    </motion.div>
  )
}

// 8. EVIDENCE SCREEN (Anti-Cobra)
function EvidenceScreen({ onNext }) {
  const [selectedType, setSelectedType] = useState(null)
  const [content, setContent] = useState('')

  const evidenceTypes = [
    { id: 'screenshot', icon: '📸', label: 'Screenshot' },
    { id: 'link', icon: '🔗', label: 'Link' },
    { id: 'flashcard', icon: '📝', label: 'Flashcard' },
    { id: 'audio', icon: '🎤', label: 'Audio 30s' },
  ]

  const handleNext = () => {
    if (!selectedType) {
      alert('Selecciona un tipo de evidencia')
      return
    }
    if (!content.trim() && selectedType !== 'screenshot' && selectedType !== 'audio') {
      alert('Agrega contenido a tu evidencia')
      return
    }
    onNext({ type: selectedType, content })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8 py-12"
    >
      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-semibold mb-2">¿Qué produjiste?</h2>
          <p className="text-gray-400 text-sm mb-2">La rata muerta, no la cola</p>
          <p className="text-red-400 text-xs font-medium">Sin evidencia = tarea no completada</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {evidenceTypes.map((type, index) => (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedType(type.id)}
              className={`p-6 rounded-2xl transition-all ${selectedType === type.id
                ? 'bg-gold-500 text-black scale-105'
                : 'bg-neutral-850/50 hover:bg-neutral-850'
                }`}
            >
              <div className="text-4xl mb-2">{type.icon}</div>
              <div className="font-medium">{type.label}</div>
            </motion.button>
          ))}
        </div>

        {/* Content Input */}
        {selectedType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex-1"
          >
            {selectedType === 'link' && (
              <input
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://..."
                className="w-full p-5 bg-neutral-850/50 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
              />
            )}
            {selectedType === 'flashcard' && (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escribe tu flashcard..."
                className="w-full h-40 p-5 bg-neutral-850/50 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 resize-none"
              />
            )}
            {selectedType === 'screenshot' && (
              <div className="p-8 border-2 border-dashed border-neutral-700 rounded-2xl text-center">
                <p className="text-gray-400 mb-4">Selecciona tu screenshot</p>
                <button
                  onClick={() => setContent('screenshot_selected.png')}
                  className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
                >
                  Seleccionar archivo
                </button>
              </div>
            )}
            {selectedType === 'audio' && (
              <div className="p-8 border-2 border-dashed border-neutral-700 rounded-2xl text-center">
                <p className="text-gray-400 mb-4">Graba tu audio de 30s</p>
                <button
                  onClick={() => setContent('audio_recorded.mp3')}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full transition-colors flex items-center gap-2 mx-auto"
                >
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  Grabar
                </button>
              </div>
            )}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="w-full py-5 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-full text-lg transition-colors"
        >
          Siguiente
        </motion.button>
      </div>
    </motion.div>
  )
}

// 9. COMPLETED SCREEN
function CompletedScreen({ currentDeepwork, totalDeepworks, sessionData, logs, onNextDeepwork, onAddExtraDeepwork, onFinishDay, onExportLogs }) {
  const isLastDeepwork = currentDeepwork >= totalDeepworks

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8 py-12"
    >
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        className="mb-8"
      >
        <Sparkles size={80} className="text-gold-500" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold mb-4"
      >
        ¡Deepwork completado!
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-12"
      >
        <p className="text-2xl text-gray-300 mb-2">
          Deepwork {currentDeepwork} de {totalDeepworks}
        </p>
        <div className="flex gap-2 justify-center mt-4">
          {[...Array(totalDeepworks)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${i < currentDeepwork ? 'bg-gold-500' : 'bg-neutral-700'
                }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-neutral-850/50 backdrop-blur-sm p-8 rounded-3xl max-w-md w-full mb-8"
      >
        <h3 className="text-xl font-semibold mb-4 text-center">Resumen de sesión</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex justify-between">
            <span>Preguntas respondidas:</span>
            <span className="font-semibold text-gold-500">{sessionData.questionsAnswered || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Tiempo de focus:</span>
            <span className="font-semibold text-gold-500">
              {Math.floor((sessionData.duration || 0) / 60)}m {(sessionData.duration || 0) % 60}s
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total de eventos:</span>
            <span className="font-semibold text-gold-500">{logs.length}</span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="space-y-4 w-full max-w-md">
        {!isLastDeepwork && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNextDeepwork}
            className="w-full py-5 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-full text-lg transition-colors"
          >
            Siguiente Deepwork
          </motion.button>
        )}

        {isLastDeepwork && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', damping: 10 }}
              className="text-center py-6"
            >
              <p className="text-3xl font-bold text-gold-500 mb-2">🎊 ¡Felicidades! 🎊</p>
              <p className="text-xl text-gray-300">
                ¡Completaste tus {totalDeepworks} deepworks del día!
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onAddExtraDeepwork}
              className="w-full py-5 bg-gold-500 hover:bg-gold-600 text-black font-semibold rounded-full text-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={24} />
              Agregar otro deepwork
            </motion.button>
          </>
        )}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExportLogs}
          className="w-full py-5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-full text-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Exportar Logs
        </motion.button>

        {isLastDeepwork && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onFinishDay}
            className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-full transition-colors"
          >
            Finalizar día
          </motion.button>
        )}
      </div>
    </motion.div>
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
            <ChevronDown size={18} className={`transition-transform ${showProjectSelector ? 'rotate-180' : ''}`} />
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
    { id: 'home', icon: PlayCircle, label: 'Iniciar Deepwork', special: true },
    { id: 'projects', icon: Folder, label: 'Proyectos' },
    { id: 'history', icon: History, label: 'Historial' },
    { id: 'metrics', icon: BarChart3, label: 'Métricas' }
  ]

  const handleNavigate = (id) => {
    if (id === 'home') {
      onNavigate(null)
    } else {
      onNavigate(id)
    }
    onClose()
  }

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
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-2 ${item.special
                    ? 'bg-gold-500 hover:bg-gold-600 text-black font-semibold'
                    : currentScreen === item.id
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

// ============= NEW NAVIGATION SCREENS =============

// PROJECT TEMPLATES — edita los nombres y GIFs a tu gusto
const PROJECT_TEMPLATES = [
  { name: 'Attempt #1 || Cybersecurity', gif: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3VhODQxc2cxbW83OXVqbTBxYTJuaGwwbjhyMnlqc2RsazliaGxoNyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TjFUxbRz3cgfbHmQxs/giphy.gif', emoji: '🛡️' },
  { name: 'Odyssey #1 || Programming Life', gif: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczF6ajhtZnFxZGJ6amswcDd1ZmlhZDk4MzN0cDhwcXNoOGhubndkeiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/alOB7OP5kiywfGjSJK/giphy.gif', emoji: '💻' },
  { name: 'Genesis #1 || InnerGlory', gif: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnAwN3M0eDU0bDA4Z2drdDRpNXYzY2g2dnFjbzd4OGw5OGE1eHZvNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FYOsEpYK7zHs3eDXmg/giphy.gif', emoji: '🌟' },
  { name: 'Duel #1 || Solus', gif: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2t2cWJ1ZGRmaThkazZ3NnkwbHpzeWhkdDY0bnQxcTY2MDMxbGo3bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ocBtGFDsOjlcp6aItx/giphy.gif', emoji: '⚔️' },
  { name: 'Pioneer #1 || Axis', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dDY3OHVkODgxZTRwdTdmcHNyaXJ1eDl6ODVpM2N1ZzNlNXhoazRrbiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/lBoZ7vCg2jcxPWmQg5/giphy.gif', emoji: '🧭' },
  { name: 'Ascend #1 || Fluctus', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3dDY3OHVkODgxZTRwdTdmcHNyaXJ1eDl6ODVpM2N1ZzNlNXhoazRrbiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/59BQveKPcDAYXoEgSW/giphy.gif', emoji: '🚀' },
  { name: 'Impulse #1 || RISE', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MW9oejNndHJseHZiZWhmYXN4ZDRzeTB6NGcyYm5sZGd6OXJvbGN2aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/qQC8JPGoSvNWZ4GI26/giphy.gif', emoji: '⚡' },
  { name: 'Lumen #1 || VERTEX', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Z3p5b3d6bXdzNmFibWJiazdyMjZsNHlkNWF6ejJxM3kzamZsdDZ5diZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/zGfutPr2gc4l74bWO1/giphy.gif', emoji: '💡' },
  { name: 'Sunrise #1 || WayWarrior', gif: 'https://media2.giphy.com/media/K91OXsr6lSjh5qxQBb/giphy.gif', emoji: '🌅' },
  { name: 'Astra #1 || Rizoma', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cHJvN3ZyM2tjZzNwazM2c20zd2ZhZTVmc3pqdnZvaWphYjF6MWdoYyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Tk0g95CHcEuLVveAj3/giphy.gif', emoji: '🌌' },
  { name: 'Attempt #1 || Daedalus Evolution', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bGR3Nm1qenRjOXJ2dHJjbjJoaXAyZnp6Znd6Y2xtaHl5amN3ZGR2aCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/FSZoHhWyU5iESIz0lo/giphy.gif', emoji: '🧬' },
  { name: 'Attempt #1 || Last Challenge Helheim', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cmFrejMyOWtjNjAwYTM5anZ3dzFmMjJpOHFxZDdidjJ6aWN0NWdrbiZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/3ixk0u8vBiNzorfwqw/giphy.gif', emoji: '💀' },
  { name: 'Attempt #1 || Courses Challenge', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3cHhiMmRuZzYxbjc3c3F3dmltYW81b2pvYjh0c3B2aWw4c2NrMWt4OSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/E69z1zeOPa5iwXDtQp/giphy.gif', emoji: '📚' },
  { name: 'Endeavor #1 || Programming Life', gif: 'https://media.giphy.com/media/U4ZItT6PM3leNZsBtt/giphy.gif', emoji: '💻' },
  { name: 'Odyssey #1 || IsPersonal', gif: 'https://media.giphy.com/media/TKDSgScrDV3yPKXMfI/giphy.gif', emoji: '👤' },
  { name: 'Unleashing #1 || Pursuit to Mastery', gif: 'https://media.giphy.com/media/yYU6Mivn9bhV0x8BmX/giphy.gif', emoji: '🔥' },
  { name: 'Prime #1 || Awaken of Greatness', gif: 'https://media.giphy.com/media/UkkOy67JwSPAGOtuXS/giphy.gif', emoji: '🦁' },
  { name: 'Genesis #1 || InnerGlory', gif: 'https://media.giphy.com/media/YWOs5jNvBu9VVpw37A/giphy.gif', emoji: '🌟' },
  { name: 'Genesis #1 || InnerGloryDAY', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MWwwcHk1bXR4OTgxbXI1bGxzMXY0bTZxY2h2MG1tcmRqdjcxdGZ0eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SHUOEPPGKwxj2/giphy.gif', emoji: '☀️' },
  { name: 'Impulse #1 || RISE', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2V6YzA4OWdiZW5xdG9uZHZxeDJyZ25sb3V4MDJ5NzNvNXduZWI3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/qUSLlL6Q1xmkg0uVHU/giphy.gif', emoji: '⚡' },
  { name: 'COURAGE #1 || DAWN', gif: ' https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2V6YzA4OWdiZW5xdG9uZHZxeDJyZ25sb3V4MDJ5NzNvNXduZWI3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/nD91xXmAdJ1M0BQWcu/giphy.gif', emoji: '🌅' },
  { name: 'COURAGE #1 || PRIMUS', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2V6YzA4OWdiZW5xdG9uZHZxeDJyZ25sb3V4MDJ5NzNvNXduZWI3byZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/nD91xXmAdJ1M0BQWcu/giphy.gif', emoji: '🛡️' },
  { name: 'LUMEN #1 || VERTEX', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bG1qMWR1anVzYzc4amtlcmMycjNzMHI5OTlsbjZ6cG05bWg1M2V4eCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/qMK2v9K0CiXiRrZWAj/giphy.gif', emoji: '💡' },
  { name: 'Pioneer #1 || God', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eXAwcHlxdnVmY2JvOWFoOTdhc21tMHJxamo4NXN1M28yemFyZW5saSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/YLKTgcET3u8BxWcazA/giphy.gif', emoji: '🔱' },
  { name: 'AXXIO #1 || Elysium', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OTZkYWo5cDQyc3h0b3ppNWE2dmJ2bDlhbDMwdWZzMmhpeTRmYjg4cSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/zi4zOxcoXW7tyQJOgC/giphy.gif', emoji: '🌈' },
  { name: 'AXXIO #1 || ISNOW', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bnpvbWU1Y2F5cW04dThsOWtlZDcyNW9zOTh2eXBnbjN5Z2Z4b2E3ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/8nMUDINw0G4VO/giphy.gif', emoji: '❄️' },
  { name: 'Ascend #1 || Fluctus', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bnpvbWU1Y2F5cW04dThsOWtlZDcyNW9zOTh2eXBnbjN5Z2Z4b2E3ZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LpiA8MVudQO8pitF4c/giphy.gif', emoji: '🚀' },
  { name: 'Astra #1 || Rizoma', gif: 'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OTRtMTZndGZyaHF1emJodTFmZmZ2c2k5czE5dGZxbGs0cXBkcTd4NyZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/Anjh1Fw8NMZOpmEWNS/giphy.gif', emoji: '🌌' },
  { name: 'Proyecto personalizado', gif: '', emoji: '📁' },
]

// PROJECTS SCREEN
function ProjectsScreen({ projects, currentProject, onSelectProject, onAddProject, onDeleteProject, onUpdateProject, history }) {
  const [showNewProject, setShowNewProject] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [step, setStep] = useState('template') // 'template' | 'confirm' | 'duration' | 'custom'
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customName, setCustomName] = useState('')
  const [customGif, setCustomGif] = useState('')
  const [customEmoji, setCustomEmoji] = useState('📁')
  const [plannedDays, setPlannedDays] = useState(7)
  const [hoursGoal, setHoursGoal] = useState(10)
  const [projectFocus, setProjectFocus] = useState('')

  const emojis = ['📚', '💻', '🎨', '🏋️', '🎵', '📝', '🔬', '📊', '🎯', '💡', '⚔️', '🛡️', '🚀', '🌟', '⚡', '🌅', '🌌', '🧭']

  const STATUS_CONFIG = {
    in_progress: { label: 'In progress', color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
    done: { label: 'Done', color: 'bg-green-500/20 text-green-300 border border-green-500/30' },
    paused: { label: 'Paused', color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  }

  const openNew = () => {
    setStep('template')
    setSelectedTemplate(null)
    setCustomName('')
    setCustomGif('')
    setCustomEmoji('📁')
    setPlannedDays(7)
    setHoursGoal(10)
    setProjectFocus('')
    setShowNewProject(true)
  }

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl)
    if (tpl.name === 'Proyecto personalizado') {
      setStep('custom')
    } else {
      setStep('confirm')
    }
  }

  const handleCreate = () => {
    const isCustom = step === 'custom' || (step === 'duration' && selectedTemplate?.name === 'Proyecto personalizado')
    const name = isCustom ? customName.trim() : selectedTemplate?.name
    if (!name) return
    const newProject = {
      id: Date.now().toString(),
      name,
      emoji: isCustom ? customEmoji : selectedTemplate.emoji,
      gif: isCustom ? customGif.trim() : selectedTemplate.gif,
      createdAt: new Date().toISOString(),
      totalDeepworks: 0,
      status: 'in_progress',
      plannedDays,
      hoursGoal,
      hoursLogged: 0,
      focus: projectFocus.trim(),
    }
    onAddProject(newProject)
    setShowNewProject(false)
  }

  const getProjectStats = (projectId) => {
    const entries = (history || []).filter(e => e.projectId === projectId)
    const minutes = Math.round(entries.reduce((s, e) => s + e.duration, 0) / 60)
    return {
      sessions: entries.length,
      deepworks: entries.reduce((s, e) => s + e.deepworksCompleted, 0),
      hours: +(minutes / 60).toFixed(2),
      entries
    }
  }

  const motivationalMsg = (pct) => {
    if (pct >= 100) return '¡Lo lograste! 🏆'
    if (pct >= 80) return '¡Casi lo tienes! Sigue empujando'
    if (pct >= 50) return '¡Muévete! Estás haciendo el mínimo'
    return '¡No es suficiente! ¡Exígete más! 🤯'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full pt-20 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-6">
        <h1 className="text-4xl font-bold">Proyectos</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-600 text-black rounded-full font-semibold transition-colors text-sm"
        >
          <Plus size={18} />
          Nuevo
        </button>
      </div>

      {/* ── KANBAN HORIZONTAL SCROLL ── */}
      <div className="flex gap-4 overflow-x-auto px-6 pb-4" style={{ scrollSnapType: 'x mandatory' }}>
        {projects.map(project => {
          const stats = getProjectStats(project.id)
          const isActive = currentProject?.id === project.id
          const status = project.status || 'in_progress'
          const statusCfg = STATUS_CONFIG[status]
          const hoursGoalVal = project.hoursGoal || 1
          const hoursLogged = stats.hours
          const pct = Math.min(Math.round((hoursLogged / hoursGoalVal) * 100), 100)
          const daysLeft = project.plannedDays
            ? Math.max(0, project.plannedDays - Math.floor((Date.now() - new Date(project.createdAt)) / 86400000))
            : null

          return (
            <motion.div
              key={project.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProject(project)}
              className={`flex-shrink-0 w-56 rounded-2xl overflow-hidden cursor-pointer bg-neutral-900 ${isActive ? 'ring-2 ring-gold-500' : ''}`}
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* GIF Top */}
              <div className="h-36 relative overflow-hidden">
                {project.gif
                  ? <img src={project.gif} alt={project.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-5xl">{project.emoji}</div>
                }
                {isActive && (
                  <div className="absolute top-2 left-2 bg-gold-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVO</div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-3">
                <p className="font-bold text-sm leading-tight mb-1 line-clamp-2">{project.name}</p>

                {daysLeft !== null && (
                  <p className="text-xs text-gray-400 mb-2">
                    {daysLeft > 0 ? `${daysLeft} días restantes` : 'Tiempo vencido'}
                  </p>
                )}

                {/* Hours progress */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">{pct}% 💡 Horas</span>
                    <span className="text-gray-500">{hoursLogged}h / {hoursGoalVal}h</span>
                  </div>
                  <div className="w-full bg-neutral-700 rounded-full h-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-green-400' : 'bg-gold-500'}`}
                    />
                  </div>
                </div>

                {/* Status badge */}
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${statusCfg.color}`}>
                  ● {statusCfg.label}
                </span>

                {/* Motivational */}
                <p className="text-[10px] text-gray-400 leading-tight">{motivationalMsg(pct)}</p>
              </div>
            </motion.div>
          )
        })}

        {/* Add card */}
        <button
          onClick={openNew}
          className="flex-shrink-0 w-14 h-56 rounded-2xl bg-neutral-800/50 hover:bg-neutral-800 border-2 border-dashed border-neutral-700 flex items-center justify-center transition-colors"
        >
          <Plus size={24} className="text-gray-500" />
        </button>
      </div>

      {/* ── PROJECT DETAIL BOTTOM SHEET ── */}
      <AnimatePresence>
        {selectedProject && (() => {
          const stats = getProjectStats(selectedProject.id)
          const isActive = currentProject?.id === selectedProject.id
          const status = selectedProject.status || 'in_progress'
          const hoursGoalVal = selectedProject.hoursGoal || 1
          const pct = Math.min(Math.round((stats.hours / hoursGoalVal) * 100), 100)

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
              onClick={() => setSelectedProject(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-neutral-900 rounded-t-3xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
              >
                {/* GIF Header */}
                {selectedProject.gif ? (
                  <div className="h-52 relative">
                    <img src={selectedProject.gif} alt={selectedProject.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute bottom-4 left-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_CONFIG[status].color}`}>
                        ● {STATUS_CONFIG[status].label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end p-4">
                    <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-neutral-800 rounded-full">
                      <X size={20} />
                    </button>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold leading-tight">{selectedProject.name}</h2>
                      {isActive && <span className="text-xs text-gold-400 font-semibold">● Proyecto activo</span>}
                    </div>
                    <span className="text-3xl">{selectedProject.emoji}</span>
                  </div>

                  {/* Focus / topic */}
                  {selectedProject.focus && (
                    <div className="mb-4 p-3 bg-neutral-800 rounded-2xl">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Enfoque</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{selectedProject.focus}</p>
                    </div>
                  )}

                  {/* Duration info */}
                  {selectedProject.plannedDays && (
                    <div className="flex gap-4 mb-4 text-sm text-gray-400">
                      <span>📅 {selectedProject.plannedDays} días planificados</span>
                      <span>🎯 {selectedProject.hoursGoal}h objetivo</span>
                    </div>
                  )}

                  {/* Hours progress bar */}
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Progreso de horas</span>
                      <span>{stats.hours}h / {hoursGoalVal}h ({pct}%)</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className={`h-2 rounded-full ${pct >= 100 ? 'bg-green-400' : 'bg-gold-500'}`}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{motivationalMsg(pct)}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Deepworks', value: selectedProject.totalDeepworks, icon: '🎯' },
                      { label: 'Sesiones', value: stats.sessions, icon: '📅' },
                      { label: 'Horas', value: stats.hours, icon: '⏱️' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-neutral-800 rounded-2xl p-3 text-center">
                        <p className="text-lg mb-1">{icon}</p>
                        <p className="text-xl font-bold text-gold-500">{value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Change status */}
                  <div className="mb-5">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Estado</p>
                    <div className="flex gap-2">
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => {
                            onUpdateProject({ ...selectedProject, status: key })
                            setSelectedProject(prev => ({ ...prev, status: key }))
                          }}
                          className={`flex-1 py-2 text-xs font-semibold rounded-full border transition-all ${status === key ? cfg.color : 'bg-neutral-800 text-gray-400 border-neutral-700 hover:bg-neutral-700'}`}
                        >
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recent sessions */}
                  {stats.entries.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Últimas sesiones</p>
                      <div className="space-y-2">
                        {stats.entries.slice(-4).reverse().map(entry => (
                          <div key={entry.id} className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-2.5">
                            <div>
                              <p className="text-sm font-medium">{new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
                              <p className="text-xs text-gray-400">{Math.floor(entry.duration / 60)} min</p>
                            </div>
                            <span className="text-gold-500 font-bold text-sm">{entry.deepworksCompleted} DW</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    {!isActive && (
                      <button
                        onClick={() => { onSelectProject(selectedProject); setSelectedProject(null) }}
                        className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full font-semibold transition-colors"
                      >
                        Activar
                      </button>
                    )}
                    {projects.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${selectedProject.name}"?`)) {
                            onDeleteProject(selectedProject.id)
                            setSelectedProject(null)
                          }
                        }}
                        className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── NEW PROJECT MODAL ── */}
      <AnimatePresence>
        {showNewProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
            onClick={() => setShowNewProject(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-neutral-900 rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-bold">
                    {step === 'template' ? '🗂️ Elige una plantilla'
                      : step === 'confirm' ? '✅ Confirmar'
                        : step === 'duration' ? '⏳ Duración y objetivo'
                          : '✏️ Personalizado'}
                  </h3>
                  <button onClick={() => setShowNewProject(false)} className="p-2 hover:bg-neutral-800 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                {/* STEP 1: template list */}
                {step === 'template' && (
                  <div className="space-y-2">
                    {PROJECT_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectTemplate(tpl)}
                        className="w-full flex items-center gap-4 p-3 bg-neutral-800 hover:bg-neutral-700 rounded-2xl transition-colors text-left"
                      >
                        {tpl.gif ? (
                          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                            <img src={tpl.gif} alt={tpl.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-neutral-700 flex items-center justify-center text-2xl flex-shrink-0">
                            {tpl.emoji}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{tpl.name}</p>
                          <p className="text-xs text-gray-400">{tpl.gif ? 'Con GIF' : 'Sin GIF'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 2: confirm template */}
                {step === 'confirm' && selectedTemplate && (
                  <div>
                    {selectedTemplate.gif && (
                      <div className="h-40 rounded-2xl overflow-hidden mb-4">
                        <img src={selectedTemplate.gif} alt={selectedTemplate.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-lg font-semibold mb-1">{selectedTemplate.emoji} {selectedTemplate.name}</p>
                    <p className="text-xs text-gray-400 mb-4">¿De qué va a tratar este proyecto?</p>
                    <textarea
                      value={projectFocus}
                      onChange={e => setProjectFocus(e.target.value)}
                      placeholder="Ej: Aprender redes, completar el curso de Python, mejorar mi físico..."
                      rows={3}
                      className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 text-sm resize-none mb-4"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button onClick={() => setStep('template')} className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors">
                        Atrás
                      </button>
                      <button onClick={() => setStep('duration')} className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full font-semibold transition-colors">
                        Continuar →
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: duration & hours goal */}
                {step === 'duration' && (
                  <div>
                    <div className="mb-6">
                      <p className="text-sm font-semibold mb-1">📅 ¿Cuántos días dura este proyecto?</p>
                      <p className="text-xs text-gray-400 mb-3">Ej: 3 días, 1 semana (7), 2 semanas (14)</p>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {[1, 3, 7, 14, 30].map(d => (
                          <button
                            key={d}
                            onClick={() => setPlannedDays(d)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${plannedDays === d ? 'bg-gold-500 text-black' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'}`}
                          >
                            {d === 1 ? '1 día' : d === 7 ? '1 semana' : d === 14 ? '2 semanas' : d === 30 ? '1 mes' : `${d} días`}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={plannedDays}
                        onChange={e => setPlannedDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-gold-500 text-sm"
                        placeholder="Días personalizados..."
                        min={1}
                      />
                    </div>

                    <div className="mb-6">
                      <p className="text-sm font-semibold mb-1">⏱️ ¿Cuántas horas objetivo?</p>
                      <p className="text-xs text-gray-400 mb-3">Total de horas de trabajo enfocado que planeas completar</p>
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {[5, 10, 20, 40, 80].map(h => (
                          <button
                            key={h}
                            onClick={() => setHoursGoal(h)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${hoursGoal === h ? 'bg-gold-500 text-black' : 'bg-neutral-800 text-gray-300 hover:bg-neutral-700'}`}
                          >
                            {h}h
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={hoursGoal}
                        onChange={e => setHoursGoal(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-gold-500 text-sm"
                        placeholder="Horas personalizadas..."
                        min={1}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => setStep(selectedTemplate?.name === 'Proyecto personalizado' ? 'custom' : 'confirm')} className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors">
                        Atrás
                      </button>
                      <button onClick={handleCreate} className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full font-semibold transition-colors">
                        Crear proyecto
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP: custom */}
                {step === 'custom' && (
                  <div>
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-2">Emoji</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {emojis.map(e => (
                          <button key={e} onClick={() => setCustomEmoji(e)}
                            className={`text-2xl p-2 rounded-lg transition-all ${customEmoji === e ? 'bg-gold-500 scale-110' : 'bg-neutral-800 hover:bg-neutral-700'}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mb-2">Nombre del proyecto</p>
                      <input
                        type="text"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        placeholder="Ej: Duel #1 || Mi Proyecto"
                        className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500 mb-4"
                        autoFocus
                      />
                      <p className="text-xs text-gray-400 mb-2">Link del GIF (opcional)</p>
                      <input
                        type="text"
                        value={customGif}
                        onChange={e => setCustomGif(e.target.value)}
                        placeholder="https://media.giphy.com/..."
                        className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-gold-500"
                      />
                      {customGif && (
                        <div className="h-32 rounded-2xl overflow-hidden mt-3">
                          <img src={customGif} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep('template')} className="flex-1 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-full transition-colors">
                        Atrás
                      </button>
                      <button onClick={() => setStep('duration')} disabled={!customName.trim()}
                        className="flex-1 py-3 bg-gold-500 hover:bg-gold-600 text-black rounded-full font-semibold transition-colors disabled:opacity-40">
                        Continuar →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}


// HISTORY SCREEN
function HistoryScreen({ history, projects, onImport }) {
  const fileInputRef = useRef(null)

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

  const downloadEntry = (entry) => {
    const dataStr = JSON.stringify(entry, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `session-${entry.projectName}-${new Date(entry.date).toISOString().split('T')[0]}.json`
    link.click()
  }

  const downloadAllHistory = () => {
    // Exportamos un objeto completo con { history, projects } para backup total
    const fullBackup = {
      timestamp: new Date().toISOString(),
      history: history,
      projects: projects || []
    }

    const dataStr = JSON.stringify(fullBackup, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `deepwork-backup-${new Date().toISOString().split('T')[0]}.json`
    link.click()
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
          <h1 className="text-4xl font-bold">Historial</h1>
          <div className="flex gap-2">
            <button
              onClick={downloadAllHistory}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gold-500 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              📤 Exportar todo
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onImport}
              className="hidden"
              accept=".json"
            />
            <button
              onClick={() => fileInputRef.current.click()}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gold-500 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              📥 Importar JSON
            </button>
          </div>
        </div>

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
                          <p className="text-xs text-gray-400 mb-2">deepworks</p>
                          <button
                            onClick={() => downloadEntry(entry)}
                            className="text-xs text-neutral-500 hover:text-gold-500 underline"
                          >
                            💾 Descargar JSON
                          </button>
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

  // ── Streak ──────────────────────────────────────────────────────
  const calcStreak = () => {
    if (history.length === 0) return { current: 0, best: 0 }
    const dates = [...new Set(history.map(e => e.date.split('T')[0]))].sort((a, b) => b.localeCompare(a))
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    let current = 0
    if (dates[0] === today || dates[0] === yStr) {
      current = 1
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000
        if (diff === 1) current++; else break
      }
    }
    let best = 0, streak = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / 86400000
      if (diff === 1) streak++; else { best = Math.max(best, streak); streak = 1 }
    }
    return { current, best: Math.max(best, streak, current) }
  }
  const { current: currentStreak, best: bestStreak } = calcStreak()

  // ── Chart data by tab ────────────────────────────────────────────
  const getDays = (n) => Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i))
    return d.toISOString().split('T')[0]
  })
  const tabConfig = {
    daily: { days: getDays(1), labelFn: () => 'Hoy' },
    weekly: { days: getDays(7), labelFn: d => new Date(d + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short' }) },
    monthly: { days: getDays(30), labelFn: d => new Date(d + 'T12:00').getDate() }
  }
  const tab = tabConfig[activeTab]
  const chartData = tab.days.map(date => {
    const entries = history.filter(e => e.date.startsWith(date))
    return {
      label: tab.labelFn(date),
      deepworks: entries.reduce((s, e) => s + e.deepworksCompleted, 0)
    }
  })
  const maxDW = Math.max(...chartData.map(d => d.deepworks), 1)

  // ── Key metrics ──────────────────────────────────────────────────
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const byDay = Array(7).fill(0)
  history.forEach(e => { byDay[new Date(e.date).getDay()] += e.deepworksCompleted })
  const mostProductiveDay = history.length ? dayNames[byDay.indexOf(Math.max(...byDay))] : '—'
  const filledDays = byDay.filter(v => v > 0)
  const leastProductiveDay = history.length && filledDays.length ? dayNames[byDay.indexOf(Math.min(...filledDays))] : '—'
  const byHour = Array(24).fill(0)
  history.forEach(e => { byHour[new Date(e.date).getHours()] += e.deepworksCompleted })
  const peakHour = byHour.indexOf(Math.max(...byHour))
  const mostActiveTime = history.length ? (peakHour < 12 ? 'Mañana' : peakHour < 18 ? 'Tarde' : 'Noche') : '—'
  const totalMin = history.reduce((s, e) => s + e.duration, 0) / 60
  const uniqueDays = new Set(history.map(e => e.date.split('T')[0])).size
  const avgMin = uniqueDays > 0 ? Math.round(totalMin / uniqueDays) : 0
  const avgFocus = history.length ? `${Math.floor(avgMin / 60)}h ${avgMin % 60}m` : '—'

  // ── SVG timeline ─────────────────────────────────────────────────
  const svgW = 300, svgH = 80
  const pts = chartData.map((d, i) => {
    const x = chartData.length > 1 ? (i / (chartData.length - 1)) * svgW : svgW / 2
    const y = svgH - (d.deepworks / maxDW) * (svgH - 10) - 5
    return `${x},${y}`
  }).join(' ')
  const area = `0,${svgH} ${pts} ${svgW},${svgH}`
  const xLabels = chartData.length <= 7
    ? chartData
    : chartData.filter((_, i) => i % Math.ceil(chartData.length / 5) === 0 || i === chartData.length - 1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full pt-20 px-4 pb-8"
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 px-4">Métricas</h1>

        {/* STREAK */}
        <div className="bg-neutral-900 rounded-2xl p-5 mb-4 mx-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Racha</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '🔥', label: 'Racha actual', value: currentStreak },
              { icon: '🏆', label: 'Mejor racha', value: bestStreak }
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-2xl font-bold">{value} <span className="text-sm font-normal text-gray-400">días</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div className="flex mx-4 mb-4 bg-neutral-900 rounded-xl p-1">
          {[['daily', 'Diario'], ['weekly', 'Semanal'], ['monthly', 'Mensual']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === id ? 'bg-neutral-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* KEY METRICS */}
        <div className="bg-neutral-900 rounded-2xl p-5 mb-4 mx-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Métricas clave</p>
          <div className="space-y-4">
            {[
              { icon: '📈', bg: 'bg-green-900/40', label: 'Día más productivo', value: mostProductiveDay },
              { icon: '📉', bg: 'bg-red-900/40', label: 'Día menos productivo', value: leastProductiveDay },
              { icon: '⏰', bg: 'bg-yellow-900/40', label: 'Hora más activa', value: mostActiveTime },
              { icon: '📊', bg: 'bg-blue-900/40', label: 'Focus diario promedio', value: avgFocus },
            ].map(({ icon, bg, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center text-lg flex-shrink-0`}>{icon}</div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOCUS TIMELINE */}
        <div className="bg-neutral-900 rounded-2xl p-5 mb-4 mx-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Focus Timeline</p>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Completa tu primer deepwork para ver datos</p>
          ) : (
            <>
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="none" style={{ height: 100 }}>
                <defs>
                  <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map(f => (
                  <line key={f} x1="0" y1={svgH * f} x2={svgW} y2={svgH * f} stroke="#374151" strokeWidth="0.5" strokeDasharray="4 4" />
                ))}
                <polygon points={area} fill="url(#areaGrad2)" />
                <polyline points={pts} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {chartData.map((d, i) => {
                  if (!d.deepworks) return null
                  const x = chartData.length > 1 ? (i / (chartData.length - 1)) * svgW : svgW / 2
                  const y = svgH - (d.deepworks / maxDW) * (svgH - 10) - 5
                  return <circle key={i} cx={x} cy={y} r="3" fill="#F59E0B" />
                })}
              </svg>
              <div className="flex justify-between mt-2">
                {xLabels.map((d, i) => (
                  <span key={i} className="text-xs text-gray-500 capitalize">{d.label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* PROJECT STATS */}
        <div className="bg-neutral-900 rounded-2xl p-5 mx-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Proyectos</p>
          <div className="space-y-4">
            {[...projects].sort((a, b) => b.totalDeepworks - a.totalDeepworks).map(project => {
              const maxP = Math.max(...projects.map(p => p.totalDeepworks), 1)
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
                        animate={{ width: `${(project.totalDeepworks / maxP) * 100}%` }}
                        transition={{ duration: 0.6 }}
                        className="bg-gold-500 h-1.5 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Stats Card Component
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



export default App

