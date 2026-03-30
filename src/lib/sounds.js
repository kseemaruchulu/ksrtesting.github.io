// Web Audio API — handles browser autoplay policy with ctx.resume()

let _ctx = null
const getCtx = () => {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  return _ctx
}

// Call this on any user interaction to unlock audio
export const unlockAudio = () => {
  try { getCtx().resume() } catch (e) {}
}

const playTone = async (freqs, type = 'sine') => {
  try {
    const ctx = getCtx()
    // Resume if suspended (browser blocks audio until user interaction)
    if (ctx.state === 'suspended') await ctx.resume()

    freqs.forEach(({ freq, start, duration, volume = 0.35 }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration + 0.05)
    })
  } catch (e) {
    console.warn('Audio playback failed:', e)
  }
}

export const playNotificationSound = async (type = 'user') => {
  // Check for custom sound override set by owner
  const key = type === 'owner' ? 'owner_sound_new_order' : 'owner_sound_status_change'
  const customUrl = localStorage.getItem(key)

  if (customUrl) {
    try {
      const audio = new Audio(customUrl)
      audio.volume = 0.7
      await audio.play()
      return
    } catch (e) {
      console.warn('Custom sound failed, using default', e)
    }
  }

  if (type === 'owner') {
    // 3-tone ascending bell — new order alert
    await playTone([
      { freq: 880,  start: 0,    duration: 0.25 },
      { freq: 1100, start: 0.18, duration: 0.25 },
      { freq: 1320, start: 0.36, duration: 0.4  },
    ])
  } else {
    // Single gentle chime — status update alert
    await playTone([
      { freq: 660, start: 0,   duration: 0.5, volume: 0.25 },
      { freq: 880, start: 0.2, duration: 0.5, volume: 0.15 },
    ])
  }
}

export const setCustomSound = (type, url) => {
  const key = type === 'owner' ? 'owner_sound_new_order' : 'owner_sound_status_change'
  if (url) localStorage.setItem(key, url)
  else localStorage.removeItem(key)
}

export const getCustomSound = (type) => {
  const key = type === 'owner' ? 'owner_sound_new_order' : 'owner_sound_status_change'
  return localStorage.getItem(key)
}
