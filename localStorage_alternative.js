// Альтернативное решение с localStorage (если БД не работает)
// Замените логику в TamagotchiPage.tsx

// Вместо загрузки из БД:
const [hasPlayedSleepVideo, setHasPlayedSleepVideo] = useState(() => {
  if (data?.currentSleepSession?.id) {
    const sessionId = data.currentSleepSession.id
    return localStorage.getItem(`sleep_video_played_${sessionId}`) === 'true'
  }
  return false
})

// В обработчиках видео:
onEnded={() => {
  console.log('🌙 Video ended, marking as played')
  if (data?.currentSleepSession?.id) {
    localStorage.setItem(`sleep_video_played_${data.currentSleepSession.id}`, 'true')
  }
  setHasPlayedSleepVideo(true)
}}
onPlay={() => {
  if (!hasPlayedSleepVideo) {
    console.log('🌙 Video started playing, marking as played')
    if (data?.currentSleepSession?.id) {
      localStorage.setItem(`sleep_video_played_${data.currentSleepSession.id}`, 'true')
    }
    setHasPlayedSleepVideo(true)
  }
}}

// При смене сессии сна очищаем localStorage:
useEffect(() => {
  if (data?.currentSleepSession?.id) {
    const sessionId = data.currentSleepSession.id
    const played = localStorage.getItem(`sleep_video_played_${sessionId}`) === 'true'
    setHasPlayedSleepVideo(played)
  } else {
    setHasPlayedSleepVideo(false)
  }
}, [data?.currentSleepSession?.id])
