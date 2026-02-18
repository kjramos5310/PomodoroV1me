import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, Plus, Check, Download, Sparkles, Menu, X, Folder, History, BarChart3, ChevronDown } from 'lucide-react'
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

  return (
    <div className="min-h-screen w-full overflow-hidden">
      <AnimatePresence mode="wait">
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
            onFinishDay={() => {
              // Mantener en la pantalla de completado
            }}
            onExportLogs={exportLogs}
          />
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
          className="relative w-64 h-64 rounded-full border-2 border-gold-500 bg-gradient-to-br from-gold-600/20 to-transparent flex items-center justify-center cursor-pointer hover:border-gold-400 transition-colors"
          animate={{
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 40 }}
        >
          <span className="text-2xl font-semibold text-gold-500 tracking-wider">
            INICIAR
          </span>
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
function MoodScreen({ onSelectMood }) {
  const [selected, setSelected] = useState(null)

  const moods = [
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
        {moods.map((mood, index) => (
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
function DeepworkConfigScreen({ mood, suggestedCount, onStart }) {
  const [count, setCount] = useState(suggestedCount)

  const getMoodGif = () => {
    const colors = {
      bajo: 'from-blue-500/20 to-blue-700/20',
      neutro: 'from-gray-500/20 to-gray-700/20',
      ready: 'from-orange-500/20 to-red-700/20',
      flow: 'from-purple-500/20 to-blue-700/20'
    }
    return colors[mood] || colors.neutro
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-8"
    >
      {/* GIF Placeholder */}
      <motion.div
        initial={{ scale: 1 }}
        className={`w-48 h-48 rounded-3xl bg-gradient-to-br ${getMoodGif()} mb-12 animate-pulse`}
      />

      <div className="text-center max-w-md w-full">
        <h2 className="text-3xl font-semibold mb-4">¿Cuántos deepworks hoy?</h2>
        <p className="text-gray-400 text-sm mb-8">Sugerido: {suggestedCount} según tu energía</p>

        {/* Slider */}
        <div className="mb-12">
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6].map((num) => (
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
function CompletedScreen({ currentDeepwork, totalDeepworks, sessionData, logs, onNextDeepwork, onFinishDay, onExportLogs }) {
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

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onExportLogs}
          className="w-full py-5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-full text-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download size={20} />
          Exportar Logs
        </motion.button>

        {isLastDeepwork && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-gray-400 text-sm mt-4"
          >
            ¡Has completado todos tus deepworks del día! 🎉
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}

export default App
