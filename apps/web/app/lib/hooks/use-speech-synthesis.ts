import { useState, useRef, useCallback, useEffect } from 'react'
import { stripMarkdownForTTS } from '~/lib/utils'

export interface SpeechSynthesisHook {
  isSupported: boolean
  speakingMessageId: string | null
  speak: (text: string, messageId: string, lang?: string) => void
  stop: () => void
}

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSupported = !!synth

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synth?.speaking) synth.cancel()
    }
  }, [])

  const stop = useCallback(() => {
    if (synth?.speaking) synth.cancel()
    setSpeakingMessageId(null)
    utteranceRef.current = null
  }, [])

  const speak = useCallback((text: string, messageId: string, lang?: string) => {
    if (!synth) return

    // If already speaking the same message, stop
    if (utteranceRef.current && speakingMessageId === messageId) {
      stop()
      return
    }

    // Stop any current speech
    if (synth.speaking) synth.cancel()

    const cleaned = stripMarkdownForTTS(text)
    if (!cleaned) return

    const utterance = new SpeechSynthesisUtterance(cleaned)
    const effectiveLang = lang || navigator.language || 'en'
    utterance.lang = effectiveLang

    // Pick a local voice for the language if available
    const voices = synth.getVoices()
    const prefix = effectiveLang.split('-')[0]
    const localVoice = voices.find(v => v.lang.startsWith(prefix) && v.localService)
      || voices.find(v => v.lang.startsWith(prefix))
    if (localVoice) utterance.voice = localVoice

    utterance.onend = () => {
      setSpeakingMessageId(null)
      utteranceRef.current = null
    }
    utterance.onerror = () => {
      setSpeakingMessageId(null)
      utteranceRef.current = null
    }

    utteranceRef.current = utterance
    setSpeakingMessageId(messageId)
    synth.speak(utterance)
  }, [speakingMessageId, stop])

  return { isSupported, speakingMessageId, speak, stop }
}
