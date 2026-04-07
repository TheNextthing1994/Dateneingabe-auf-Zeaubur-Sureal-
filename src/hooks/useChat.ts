import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { getEnv } from '../env';
import { LogEntry, AnalyzedItem, BillboardItem } from '../types';
import { surrealService } from '../services/surrealService';

export function useChat(
  showNotification: (msg: string, type: 'success' | 'warn' | 'info') => void,
  surrealStatus: 'disconnected' | 'connecting' | 'connected',
  logs: LogEntry[],
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>,
  selectedSeeds: AnalyzedItem[],
  missionInput: string,
  pinnedIntelItems: BillboardItem[],
  pinnedBlockerItems: BillboardItem[]
) {
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const handleChatSubmit = useCallback(async (e?: React.FormEvent, isDeep: boolean = false) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || isChatting) return;

    setIsChatting(true);
    const userMsgId = Date.now().toString();
    const userLog: LogEntry = {
      id: userMsgId,
      sender: 'User',
      text,
      timestamp: Date.now()
    };
    setLogs(prev => [...prev, userLog]);
    if (surrealStatus === 'connected') {
      surrealService.saveLog(userLog).catch(console.error);
    }
    setChatInput('');

    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      if (!apiKey) {
        showNotification('Gemini API Key fehlt.', 'warn');
        setIsChatting(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      
      // Fetch context
      let contextData = "";
      
      if (selectedSeeds.length > 0) {
        contextData = `
Hier sind die vom Nutzer SPEZIELL AUSGEWÄHLTEN Seeds für diesen Chat-Kontext:
${selectedSeeds.map(s => `- [${s.category}] ${s.text} (Score: ${s.score}, Säule: ${s.pillarId}, Vault: ${s.vaultId})`).join('\n')}

Bitte konzentriere dich primär auf diese ausgewählten Informationen.
`;
      } else if (surrealStatus === 'connected') {
        const [seeds, missions] = await Promise.all([
          surrealService.getSeeds(),
          surrealService.getMissions()
        ]);
        
        contextData = `
Hier sind die aktuellen Daten aus deiner SurrealDB Datenbank:
SEEDS (Gedanken, Ideen, Projekte):
${seeds.map(s => `- [${s.category}] ${s.text} (Score: ${s.score}, Säule: ${s.pillarId}, Vault: ${s.vaultId})`).join('\n')}

MISSIONEN (Geplante Aufgaben):
${missions.map(m => `- ${m.text} (Ziel-Datum: ${m.targetDate})`).join('\n')}
`;
      } else {
        contextData = "Hinweis: SurrealDB ist aktuell nicht verbunden. Ich habe nur Zugriff auf die lokalen Daten.";
      }

      const billboardContext = `
AKTUELLER BILLBOARD-STATUS (Festgenagelte Relevanz & Prioritäten):
- AKTIVE MISSION: ${missionInput || 'Keine aktive Mission eingeloggt.'}
- PINNED INTEL (Wichtige Erkenntnisse/Einschränkungen):
${(pinnedIntelItems?.length || 0) > 0 ? pinnedIntelItems.map(i => `  * [${i.origin}] ${i.text} (Ablauf: ${i.expiry})${i.nextStep ? ` - NÄCHSTER SCHRITT: ${i.nextStep}` : ''}`).join('\n') : '  Keine Intel gepinnt.'}
- BLOCKER / WARNUNGEN:
${(pinnedBlockerItems?.length || 0) > 0 ? pinnedBlockerItems.map(i => `  * [${i.origin}] ${i.text} (Ablauf: ${i.expiry})`).join('\n') : '  Keine Blocker gepinnt.'}
`;

      const chatHistory = logs.slice(-10).map(l => `${l.sender === 'User' ? 'Nutzer' : l.sender}: ${l.text}`).join('\n\n');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Du bist D.T. Kern, der digitale Zwilling und Analyst des Nutzers. 
        Deine Aufgabe ist es, den Nutzer basierend auf seinen Daten zu beraten.
        
        ${billboardContext}
        
        KONTEXT AUS DER DATENBANK:
        ${contextData}
        
        GESPRÄCHSVERLAUF (Letzte Nachrichten):
        ${chatHistory}
        
        NUTZER-ANFRAGE:
        ${text}`,
        config: {
          systemInstruction: isDeep 
            ? "Du bist D.T. Kern. Deine ABSOLUTE PRIORITÄT ist der Billboard-Status. 1. AKTIVE MISSION: Alles was du vorschlägst, muss diese Mission unterstützen oder zumindest nicht behindern. 2. BLOCKER: Wenn der Nutzer etwas verlangt, das einem Blocker auf dem Billboard widerspricht, musst du ihn SOFORT darauf hinweisen und die Anfrage ablehnen oder korrigieren (Reality Check). 3. INTEL: Beachte alle Einschränkungen (Zeit, Ressourcen) und den 'NÄCHSTEN SCHRITT' der gepinnten Intel. Wenn ein Intel einen nächsten Schritt hat, ist dies deine primäre Handlungsempfehlung. Antworte tiefgründig, analytisch und ohne Begrüßung. Nutze die 5 Säulen als Kompass."
            : "Du bist D.T. Kern. Deine Beratung basiert ZUERST auf dem Billboard (Mission, Intel, Blocker). Wenn ein Pinned Intel existiert, ist dies dein primärer Fokus. Weise direkt auf Blocker hin. Antworte extrem kurz (max 2 Sätze). Sei präzise und direkt.",
        }
      });

      const aiText = response.text || "Ich konnte keine Antwort generieren.";
      
      const aiLog: LogEntry = {
        id: (Date.now() + 1).toString(),
        sender: 'D.T. Kern',
        text: aiText,
        timestamp: Date.now()
      };
      setLogs(prev => [...prev, aiLog]);
      if (surrealStatus === 'connected') {
        surrealService.saveLog(aiLog).catch(console.error);
      }
    } catch (err) {
      console.error('Chat Error:', err);
      showNotification('Fehler beim Chatten mit D.T. Kern.', 'warn');
      setLogs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'System',
        text: 'Fehler bei der Kommunikation mit der KI.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatting(false);
    }
  }, [chatInput, isChatting, logs, missionInput, pinnedBlockerItems, pinnedIntelItems, selectedSeeds, setLogs, showNotification, surrealStatus]);

  return {
    chatInput,
    setChatInput,
    isChatting,
    setIsChatting,
    handleChatSubmit
  };
}
