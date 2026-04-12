import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { AnalyzedItem, LogEntry } from '../types';
import { surrealService } from '../services/surrealService';
import { getEnv } from '../env';
import { INITIAL_PILLARS } from '../constants';

export function useSeeds(
  showNotification: (msg: string, type: 'success' | 'warn' | 'info') => void,
  surrealStatus: 'disconnected' | 'connecting' | 'connected',
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>
) {
  const [seedInput, setSeedInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [isFileLoading, setIsFileLoading] = useState(false);

  const handleAnalyze = useCallback(async () => {
    const text = seedInput.trim();
    if (!text) {
      showNotification('Input leer. Bitte Seed eingeben.', 'warn');
      return;
    }

    // Check for API Key
    const apiKey = getEnv('VITE_GEMINI_API_KEY');
    if (!apiKey) {
      showNotification('Gemini API Key fehlt. Bitte VITE_GEMINI_API_KEY in den Umgebungsvariablen setzen.', 'warn');
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: 'FEHLER: Kein API Key gefunden. Wenn du auf Zeabur hostest, stelle sicher, dass die Variable VITE_GEMINI_API_KEY (mit VITE_ Präfix) gesetzt ist und die App danach neu gebaut wurde.',
        timestamp: Date.now()
      }]);
      return;
    }

    setIsAnalyzing(true);
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'User',
      text,
      timestamp: Date.now()
    }]);
    setSeedInput('');

    let contentToAnalyze = text;
    let isYoutube = false;
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?([a-zA-Z0-9_-]{11})/;
    const match = text.match(youtubeRegex);

    if (match) {
      isYoutube = true;
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'System',
        text: 'YouTube-Link erkannt. Starte Deep-Scan (Transkript-Abruf)...',
        timestamp: Date.now()
      }]);

      try {
        const transcriptResponse = await fetch(`/api/youtube/transcript?url=${encodeURIComponent(text)}`);
        const contentType = transcriptResponse.headers.get("content-type");
        
        if (transcriptResponse.ok && contentType && contentType.includes("application/json")) {
          const data = await transcriptResponse.json();
          contentToAnalyze = `YouTube Video Transkript: ${data.transcript}`;
          setLogs(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            sender: 'System',
            text: `Transkript erfolgreich abgerufen (${data.parts} Segmente). Starte KI-Analyse...`,
            timestamp: Date.now()
          }]);
        } else {
          const errorText = await transcriptResponse.text();
          console.warn('Failed to fetch transcript, falling back to URL analysis. Response:', errorText.substring(0, 100));
          
          let errorMsg = 'Transkript-Abruf fehlgeschlagen (Video hat evtl. keine Untertitel). Analysiere nur den Link...';
          if (errorText.includes('<!DOCTYPE html>')) {
            errorMsg = 'System-Fehler beim Transkript-Abruf (Server lieferte HTML statt JSON). Analysiere nur den Link...';
          }

          setLogs(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            sender: 'System',
            text: errorMsg,
            timestamp: Date.now()
          }]);
        }
      } catch (err) {
        console.error('Transcript fetch error:', err);
        setLogs(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          sender: 'System',
          text: 'Netzwerk-Fehler beim Transkript-Abruf. Analysiere nur den Link...',
          timestamp: Date.now()
        }]);
      }
    }

    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analysiere diesen "Seed" (Gedanke, Idee, Projekt, Kundenanfrage, oder ein Video-Transkript) und kategorisiere ihn.
        
        ${isYoutube ? "Dies ist ein Transkript eines YouTube-Videos. Extrahiere die wichtigsten Erkenntnisse und erstelle eine prägnante Zusammenfassung (max 2 Sätze) für das Feld 'text'. Wenn der Titel des Videos im Transkript erkennbar ist, nutze ihn als Präfix." : ""}
        
        Seed: "${contentToAnalyze}"
        
        Säulen (pillarId):
        - health (Gesundheit)
        - dev (Pers. Entwicklung)
        - finance (Business & Finanzen)
        - mindset (Mentalität)
        - islam (Islam/Sirat)
        
        Vaults (vaultId):
        - ideen: Neue Konzepte, Geistesblitze.
        - projekte: Konkrete Vorhaben, komplexe Aufgaben.
        - kunden: Kundenanfragen (Websites, Apps, AI Agents, Automatisierungen, Business-Deals).
        - ziele: Langfristige Missionen.
        - workflows: Strategien, Prozesse.
        - academy: Weiterbildungen, Kurse, Abonnements, Logins, Credentials, Kosten für Bildung.
        - erkenntnisse: Gelerntes, Aha-Momente.
        - toolbox: Werkzeuge, Links.
        
        Impact-Score (1.0 bis 10.0):
        - 8-10: GAME CHANGER (Hoher Hebel)
        - 4-7: SOLID WORK (Wichtig, aber inkrementell)
        - 1-3: NOISE (Ablenkung, geringer Wert)
        
        Zusätzlich:
        - reasoning: Warum ist dieser Seed ein Game Changer oder Solid Work? (1 Satz)
        - nextStep: Was ist der nächste konkrete Schritt? (1 Satz)
        - status: Standardmäßig "Offen".
        - duration: Geschätzter Zeitbedarf (z.B. "15 Min", "45 Min", "2h").
        - blockedBy: Was blockiert diesen Seed aktuell? (Falls nichts, "Keine").
        - missionType: Einer der folgenden Typen: "Bauen", "Denken", "Planen", "Entscheiden", "Dokumentieren".
        - consequence: Was passiert, wenn man diesen Seed ignoriert? (1 kurzer Satz).
        
        Gib das Ergebnis als JSON zurück.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              score: { type: Type.NUMBER },
              pillarId: { type: Type.STRING },
              vaultId: { type: Type.STRING },
              category: { 
                type: Type.STRING, 
                enum: ["GAME CHANGER", "SOLID WORK", "NOISE"],
                description: "Die Kategorie basierend auf dem Score (8-10: GAME CHANGER, 4-7: SOLID WORK, 1-3: NOISE)"
              },
              reasoning: { type: Type.STRING },
              nextStep: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["Offen", "In Arbeit", "Blockiert"] },
              duration: { type: Type.STRING },
              blockedBy: { type: Type.STRING },
              missionType: { type: Type.STRING, enum: ["Bauen", "Denken", "Planen", "Entscheiden", "Dokumentieren"] },
              consequence: { type: Type.STRING }
            },
            required: ["text", "score", "pillarId", "vaultId", "category", "reasoning", "nextStep", "status", "duration", "blockedBy", "missionType", "consequence"]
          }
        }
      });

      if (!response.text) {
        throw new Error('Die KI hat keine Text-Antwort geliefert. Möglicherweise wurde die Anfrage durch Sicherheitsfilter blockiert oder der API-Key ist ungültig.');
      }

      let result;
      try {
        result = JSON.parse(response.text);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        throw new Error('Die KI hat kein gültiges JSON geliefert.');
      }
      
      if (!result) {
        throw new Error('Die KI hat ein leeres Ergebnis geliefert.');
      }
      
      // Fallback logic for category based on score if AI returns something else
      let finalCategory: 'GAME CHANGER' | 'SOLID WORK' | 'NOISE' = result.category as any;
      const score = result.score || 5;
      
      if (!['GAME CHANGER', 'SOLID WORK', 'NOISE'].includes(finalCategory)) {
        if (score >= 8) finalCategory = 'GAME CHANGER';
        else if (score >= 4) finalCategory = 'SOLID WORK';
        else finalCategory = 'NOISE';
      }

      const newItem: AnalyzedItem = {
        id: Date.now().toString(),
        text: result.text || text,
        score: score,
        pillarId: result.pillarId || 'dev',
        vaultId: result.vaultId as any || 'ideen',
        category: finalCategory,
        reasoning: result.reasoning || '',
        nextStep: result.nextStep || '',
        status: result.status as any || 'Offen',
        duration: result.duration || 'Unbekannt',
        blockedBy: result.blockedBy || 'Keine',
        missionType: result.missionType as any || 'Bauen',
        consequence: result.consequence || '',
        timestamp: Date.now(),
        sourceUrl: isYoutube ? text : undefined
      };

      setAnalyzedItems(prev => [newItem, ...prev]);
      
      if (surrealStatus === 'connected') {
        await surrealService.saveSeed(newItem);
      }

      showNotification('Seed analysiert und gesichert.', 'success');
      
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'D.T. Kern',
        text: `Analyse abgeschlossen: [${newItem.vaultId.toUpperCase()}] ${newItem.text} (Score: ${newItem.score.toFixed(1)}). Zugeordnet zu: ${INITIAL_PILLARS.find(p => p.id === newItem.pillarId)?.name || 'Unbekannt'}.`,
        timestamp: Date.now()
      }]);

    } catch (err) {
      console.error('Analysis Error:', err);
      showNotification('Fehler bei der KI-Analyse.', 'warn');
    } finally {
      setIsAnalyzing(false);
    }
  }, [seedInput, surrealStatus, setLogs, showNotification]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('text/') && !file.name.endsWith('.log') && !file.name.endsWith('.txt')) {
      showNotification('Bitte nur Textdateien (.txt, .log) hochladen.', 'warn');
      return;
    }

    setIsFileLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setIsFileLoading(false);
        return;
      }

      // Check for API Key
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      if (!apiKey) {
        showNotification('Gemini API Key fehlt.', 'warn');
        setLogs(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          text: 'FEHLER: Datei-Analyse nicht möglich, da kein API Key gefunden wurde (VITE_GEMINI_API_KEY erforderlich).',
          timestamp: Date.now()
        }]);
        setIsFileLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: `Datei "${file.name}" empfangen (${content.length} Zeichen). Starte Deep-Analysis...`,
        timestamp: Date.now()
      }]);

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Analysiere diesen Text und extrahiere die sinnvollsten, handlungsrelevanten Informationen. 
          Erstelle eine Liste von "Seeds". Jedes Element muss folgendes enthalten:
          - text: Eine kurze, prägnante Zusammenfassung der Info.
          - score: Ein Impact-Score von 1.0 bis 10.0.
          - pillarId: Eine der IDs: health, dev, finance, mindset, islam.
          - vaultId: Eine der IDs: ideen, projekte, kunden, ziele, workflows, academy, erkenntnisse, toolbox.
          - category: Entweder "GAME CHANGER" (Score 8-10), "SOLID WORK" (4-7) oder "NOISE" (1-3).
          
          Vault-Logik (WICHTIG):
          - ideen: Neue Konzepte, Geistesblitze, kreative Ansätze.
          - projekte: Konkrete Vorhaben, komplexe Aufgabenpakete, laufende Projekte.
          - kunden: Kundenanfragen, Business-Deals, Website/App/AI-Agent Anfragen, Automatisierungs-Wünsche.
          - ziele: Langfristige Missionen, Meilensteine, Visionen.
          - workflows: Strategien, Prozesse, n8n-Logik, Schritt-für-Schritt Anleitungen.
          - academy: Weiterbildungen, Kurse, Abonnements, Logins, Credentials, Kosten für Bildung.
          - erkenntnisse: Gelerntes, Aha-Momente, tiefere Einsichten, Weisheiten.
          - toolbox: Werkzeuge, Links, Ressourcen, Snippets.
          
          Text zum Analysieren:
          ${content}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  pillarId: { type: Type.STRING },
                  vaultId: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["text", "score", "pillarId", "vaultId", "category"]
              }
            }
          }
        });

        if (!response.text) throw new Error('Keine Antwort');
        const items: any[] = JSON.parse(response.text);
        
        const newItems: AnalyzedItem[] = items.map(item => ({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: item.text,
          score: item.score,
          pillarId: item.pillarId,
          vaultId: item.vaultId,
          category: item.category,
          timestamp: Date.now(),
          status: 'Offen',
          missionType: 'Bauen'
        }));

        setAnalyzedItems(prev => [...newItems, ...prev]);
        
        if (surrealStatus === 'connected') {
          for (const item of newItems) {
            await surrealService.saveSeed(item);
          }
        }

        showNotification(`${newItems.length} Seeds aus Datei extrahiert.`, 'success');
        setLogs(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'D.T. Kern',
          text: `Deep-Analysis abgeschlossen. ${newItems.length} neue Seeds wurden im Vault gesichert.`,
          timestamp: Date.now()
        }]);

      } catch (err) {
        console.error('File Analysis Error:', err);
        showNotification('Fehler bei der Datei-Analyse.', 'warn');
      } finally {
        setIsFileLoading(false);
      }
    };
    reader.readAsText(file);
  }, [surrealStatus, setLogs, showNotification]);

  return {
    seedInput,
    setSeedInput,
    isAnalyzing,
    analyzedItems,
    setAnalyzedItems,
    isFileLoading,
    setIsAnalyzing,
    handleAnalyze,
    handleFileUpload,
    handleDeleteSeed: useCallback(async (item: AnalyzedItem) => {
      try {
        if (surrealStatus === 'connected' && item.rawId) {
          await surrealService.deleteSeed(item.rawId);
        }
        
        setAnalyzedItems(prev => prev.filter(i => i.id !== item.id));
        showNotification('Seed erfolgreich gelöscht.', 'info');
        
        setLogs(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'System',
          text: `Seed gelöscht: ${(item.text || '').substring(0, 30)}...`,
          timestamp: Date.now()
        }]);
      } catch (err) {
        console.error('Delete Error:', err);
        showNotification('Fehler beim Löschen des Seeds.', 'warn');
      }
    }, [surrealStatus, setAnalyzedItems, showNotification, setLogs])
  };
}
