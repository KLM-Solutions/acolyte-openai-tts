import OpenAI from "openai"
import { type NextRequest, NextResponse } from "next/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set")
      return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
    }

    const body = await req.json()
    const { text, voice, format = "mp3" } = body

    console.log("Request received:", { text: text?.substring(0, 50), voice, format })

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required and must be a string" }, { status: 400 })
    }

    if (!voice || typeof voice !== "string") {
      return NextResponse.json({ error: "Voice is required and must be a string" }, { status: 400 })
    }

    // Validate voice options
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
    if (!validVoices.includes(voice)) {
      return NextResponse.json({ error: `Invalid voice. Must be one of: ${validVoices.join(", ")}` }, { status: 400 })
    }

    // Validate format options
    const validFormats = ["mp3", "opus", "aac", "flac", "wav", "pcm"]
    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: `Invalid format. Must be one of: ${validFormats.join(", ")}` }, { status: 400 })
    }

    console.log("Generating speech with OpenAI...")

    // Generate speech using OpenAI TTS
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      response_format: format as "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm",
    })

    console.log("OpenAI response received")

    // Get content type based on format
    const getContentType = (format: string) => {
      switch (format) {
        case "mp3":
          return "audio/mpeg"
        case "opus":
          return "audio/opus"
        case "aac":
          return "audio/aac"
        case "flac":
          return "audio/flac"
        case "wav":
          return "audio/wav"
        case "pcm":
          return "audio/pcm"
        default:
          return "audio/mpeg"
      }
    }

    // Convert the response to a buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer())
    console.log("Audio buffer created, size:", audioBuffer.length)

    if (audioBuffer.length === 0) {
      throw new Error("OpenAI returned empty audio buffer")
    }

    // Return the audio as a response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": getContentType(format),
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Detailed error in API route:", error)

    // Handle different types of errors
    if (error instanceof Error) {
      // Check for specific OpenAI errors
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "Invalid or missing OpenAI API key", details: error.message },
          { status: 401 },
        )
      }

      if (error.message.includes("quota")) {
        return NextResponse.json({ error: "OpenAI API quota exceeded", details: error.message }, { status: 429 })
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later.", details: error.message },
          { status: 429 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to generate speech",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: "Unknown error occurred while generating speech" }, { status: 500 })
  }
}
