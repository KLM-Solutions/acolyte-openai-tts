"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Volume2, Square, AlertCircle } from "lucide-react"

export default function ChatPage() {
  const [text, setText] = useState("")
  const [voice, setVoice] = useState("alloy")
  const [format, setFormat] = useState("mp3")
  const [streaming, setStreaming] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleGenerateSpeech = async () => {
    if (!text.trim()) return

    setIsGenerating(true)
    setAudioUrl(null)
    setIsPlaying(false)
    setError(null)

    try {
      console.log("Making request to /api/chat...")

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: voice,
          format: format,
          streaming: streaming,
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        // Handle error responses
        const contentType = response.headers.get("content-type")
        let errorMessage = `Server error (${response.status})`

        if (contentType?.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.details || errorData.error || errorMessage
          } catch (jsonError) {
            console.error("Failed to parse JSON error:", jsonError)
            errorMessage = `Server error (${response.status}): Unable to parse error response`
          }
        } else {
          // For non-JSON responses, read as text
          try {
            const textResponse = await response.text()
            errorMessage = `Server error (${response.status}): ${textResponse.substring(0, 200)}...`
          } catch (textError) {
            console.error("Failed to read text error:", textError)
            errorMessage = `Server error (${response.status}): Unable to read error response`
          }
        }

        throw new Error(errorMessage)
      }

      // Success case - check if response is actually audio
      const contentType = response.headers.get("content-type")
      console.log("Success response content-type:", contentType)

      if (!contentType?.startsWith("audio/")) {
        throw new Error(`Expected audio response, got: ${contentType}`)
      }

      // Read the response as blob for audio data
      const audioBlob = await response.blob()
      console.log("Audio blob size:", audioBlob.size)

      if (audioBlob.size === 0) {
        throw new Error("Received empty audio file")
      }

      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)

      // Auto-play if streaming is enabled for immediate feedback
      if (streaming) {
        setTimeout(() => {
          handlePlayAudio()
        }, 100)
      }
    } catch (error) {
      console.error("Error generating speech:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePlayAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.play().catch((playError) => {
        console.error("Error playing audio:", playError)
        setError("Failed to play audio. Please try again.")
      })
      setIsPlaying(true)
    }
  }

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case "mp3":
        return "MP3 - Default, general use"
      case "opus":
        return "Opus - Low latency streaming"
      case "aac":
        return "AAC - High quality compression"
      case "flac":
        return "FLAC - Lossless compression"
      case "wav":
        return "WAV - Uncompressed, low latency"
      case "pcm":
        return "PCM - Raw audio samples"
      default:
        return ""
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">OpenAI Realtime Voice</CardTitle>
            <p className="text-gray-600 mt-2">Convert your text to natural-sounding speech with OpenAI</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={clearError} className="ml-2">
                    ×
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="text-input" className="text-sm font-medium text-gray-700">
                Enter your text
              </label>
              <Input
                id="text-input"
                placeholder="Type the text you want to convert to speech..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="voice-model" className="text-sm font-medium text-gray-700">
                  Select Voice
                </label>
                <Select value={voice} onValueChange={setVoice} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="fable">Fable</SelectItem>
                    <SelectItem value="onyx">Onyx</SelectItem>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="shimmer">Shimmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="format-select" className="text-sm font-medium text-gray-700">
                  Audio Format
                </label>
                <Select value={format} onValueChange={setFormat} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp3">MP3</SelectItem>
                    <SelectItem value="opus">Opus</SelectItem>
                    <SelectItem value="aac">AAC</SelectItem>
                    <SelectItem value="flac">FLAC</SelectItem>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="pcm">PCM</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{getFormatDescription(format)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="streaming-mode" checked={streaming} onCheckedChange={setStreaming} disabled={isGenerating} />
              <Label htmlFor="streaming-mode" className="text-sm font-medium text-gray-700">
                Auto-play when ready
              </Label>
            </div>

            <Button onClick={handleGenerateSpeech} disabled={!text.trim() || isGenerating} className="w-full" size="lg">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Speech...
                </>
              ) : (
                "Generate Speech"
              )}
            </Button>

            {audioUrl && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Speech generated successfully!</span>
                  <div className="flex gap-2">
                    {!isPlaying ? (
                      <Button
                        onClick={handlePlayAudio}
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300 hover:bg-green-100"
                      >
                        <Volume2 className="mr-2 h-4 w-4" />
                        Play Audio
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStopAudio}
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-300 hover:bg-red-100"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                    )}
                  </div>
                </div>
                <audio ref={audioRef} controls className="w-full" onEnded={handleAudioEnded}>
                  <source src={audioUrl} type={`audio/${format}`} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
