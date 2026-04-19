"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTimerOptions {
  startedAt: Date | string | null
  isRunning: boolean
  onThreshold?: () => void
  warningMinutes?: number
}

export function useTimer({ startedAt, isRunning, onThreshold, warningMinutes = 30 }: UseTimerOptions) {
  const [display, setDisplay] = useState('00:00:00')
  const [isWarning, setIsWarning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializedRef = useRef(false)

  const calculateDisplay = useCallback(() => {
    if (!startedAt) {
      setDisplay('00:00:00')
      return
    }

    const start = new Date(startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - start) / 1000)

    const hours = Math.floor(elapsed / 3600)
    const minutes = Math.floor((elapsed % 3600) / 60)
    const seconds = elapsed % 60

    setDisplay(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    )

    const elapsedMinutes = Math.floor(elapsed / 60)
    if (elapsedMinutes >= warningMinutes) {
      setIsWarning(true)
      onThreshold?.()
    }
  }, [startedAt, warningMinutes, onThreshold])

  useEffect(() => {
    if (isRunning && startedAt) {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true
        setTimeout(() => calculateDisplay(), 0)
      }
      intervalRef.current = setInterval(calculateDisplay, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isInitializedRef.current = false
      setTimeout(() => {
        setDisplay('00:00:00')
        setIsWarning(false)
      }, 0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startedAt, calculateDisplay])

  return { display, isWarning }
}