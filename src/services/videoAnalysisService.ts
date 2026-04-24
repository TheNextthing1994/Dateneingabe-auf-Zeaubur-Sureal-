import { GoogleGenAI } from "@google/genai";
import { getEnv } from "../env";

export interface VideoAnalysisResult {
  url: string;
  question: string;
  answer: string;
  timestamp: number;
  status: string;
}

export class VideoAnalysisService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = getEnv("GOOGLE_API_KEY") || getEnv("VITE_GEMINI_API_KEY");
    if (!apiKey) {
      console.warn("Neither GOOGLE_API_KEY nor VITE_GEMINI_API_KEY is set. Video analysis will not work.");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeVideo(youtubeUrl: string, userPrompt: string, onLog?: (message: string) => void, videoBase64?: string): Promise<string> {
    try {
      onLog?.("Initialisiere Analyse für Modell: gemini-flash-latest");
      
      const parts: any[] = [];

      if (videoBase64) {
        onLog?.("Video-Datei erkannt. Starte MULTIMODALE Analyse (Frames & Audio)...");
        parts.push({
          inlineData: {
            data: videoBase64,
            mimeType: "video/mp4" // Assuming mp4, should be dynamic in a real app
          }
        });
        parts.push({
          text: `Analysiere dieses hochgeladene Video.\n\nFrage: ${userPrompt}`
        });
      } else {
        onLog?.(`YouTube URL: ${youtubeUrl}`);
        // 1. Fetch Transcript/Metadata from our backend proxy
        onLog?.("Rufe Video-Transkript/Metadaten vom Server ab...");
        let contextData = "";
        try {
          const transcriptRes = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(youtubeUrl)}`);
          if (transcriptRes.ok) {
            const data = await transcriptRes.json();
            if (data.transcript) {
              contextData = data.transcript;
              onLog?.(`Erfolgreich: ${data.parts > 0 ? `Transkript mit ${data.parts} Teilen` : "Metadaten (Titel/Beschreibung)"} geladen.`);
            }
          } else {
            onLog?.("WARNUNG: Konnte Transkript nicht laden. Nutze nur URL-Kontext.");
          }
        } catch (fetchErr) {
          onLog?.("WARNUNG: Fehler beim Abrufen des Transkripts. Nutze nur URL-Kontext.");
        }

        parts.push({ fileData: { mimeType: 'video/youtube', fileUri: youtubeUrl } });
        parts.push({
          text: `Du bist ein spezialisierter Video-Analyst. Analysiere das folgende Video.\n\nDATENQUELLE (TRANSKRIPT/METADATEN):\n---\n${contextData || "KEINE DATEN VERFÜGBAR."}\n---\n\nVIDEO-URL: ${youtubeUrl}\n\nNUTZER-FRAGE: ${userPrompt}\n\nANWEISUNG: Nutze das bereitgestellte Transkript und die Metadaten, um die Frage präzise zu beantworten. Falls Zeitstempel vorhanden sind, beziehe dich darauf.`
        });
      }

      onLog?.("Sende Request an Gemini API...");
      
      const response = await this.ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ parts }],
        config: {
          systemInstruction: "Du bist ein Video-Analyst. Deine Aufgabe ist es, Videos tiefenanalysieren zu können. Erkenne visuelle Details (falls Video-Upload), höre auf das Gesagte (Transkript) und versehe deine Antworten mit präzisen Zeitstempeln (z.B. [03:34]). Sei analytisch, präzise und direkt.",
          // Removed googleSearch and urlContext to avoid 403 Forbidden errors in this environment
        }
      });

      onLog?.("Antwort von Gemini erhalten.");
      return response.text || "Keine Analyseergebnisse erhalten.";
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      onLog?.(`FEHLER: ${errorMsg}`);
      console.error("Error in analyzeVideo:", error);
      throw new Error("Fehler bei der Video-Analyse: " + errorMsg);
    }
  }
}

export const videoAnalysisService = new VideoAnalysisService();
