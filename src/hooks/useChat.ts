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
    
    // YouTube Detection
    const youtubeMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    
    if (youtubeMatch) {
      const videoUrl = youtubeMatch[0];
      const systemLog: LogEntry = {
        id: (Date.now() + 2).toString(),
        sender: 'System',
        text: `YouTube Link erkannt: ${videoUrl}. Starte Video-Analyse...`,
        timestamp: Date.now()
      };
      setLogs(prev => [...prev, systemLog]);
      if (surrealStatus === 'connected') {
        surrealService.saveLog(systemLog).catch(console.error);
      }
      
      try {
        const videoService = (await import('../services/videoAnalysisService')).videoAnalysisService;
        
        const response = await videoService.analyzeVideo(
          videoUrl,
          "Analysiere dieses Video basierend auf unserer bisherigen Unterhaltung.",
          (log) => {
            console.log("Video Analysis Log:", log);
          }
        );

        const aiLog: LogEntry = {
          id: (Date.now() + 3).toString(),
          sender: 'DT',
          text: `🎥 VIDEO-ANALYSE:\n\n${response}`,
          timestamp: Date.now()
        };
        setLogs(prev => [...prev, aiLog]);
        if (surrealStatus === 'connected') {
          surrealService.saveLog(aiLog).catch(console.error);
        }
      } catch (err) {
        showNotification('Video-Analyse fehlgeschlagen.', 'warn');
      }
      setIsChatting(false);
      return;
    }

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
        contents: `Du bist DT, der digitale Zwilling und Analyst des Nutzers. 
        Deine Aufgabe ist es, den Nutzer basierend auf seinen Daten zu beraten.
        
        ${billboardContext}
        
        KONTEXT AUS DER DATENBANK:
        ${contextData}
        
        GESPRÄCHSVERLAUF (Letzte Nachrichten):
        ${chatHistory}
        
        NUTZER-ANFRAGE:
        ${text}`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: isDeep 
            ? "Du bist DT. Deine ABSOLUTE PRIORITÄT ist der Billboard-Status. 1. AKTIVE MISSION: Alles was du vorschlägst, muss diese Mission unterstützen oder zumindest nicht behindern. 2. BLOCKER: Wenn der Nutzer etwas verlangt, das einem Blocker auf dem Billboard widerspricht, musst du ihn SOFORT darauf hinweisen und die Anfrage ablehnen oder korrigieren (Reality Check). 3. INTEL: Beachte alle Einschränkungen (Zeit, Ressourcen) und den 'NÄCHSTEN SCHRITT' der gepinnten Intel. Wenn ein Intel einen nächsten Schritt hat, ist dies deine primäre Handlungsempfehlung. Antworte tiefgründig, analytisch und ohne Begrüßung. Nutze die 5 Säulen als Kompass. NUTZE GOOGLE SEARCH für aktuelle Fakten oder wenn du Informationen außerhalb deiner Datenbank benötigst."
            : "Du bist DT. Deine Beratung basiert ZUERST auf dem Billboard (Mission, Intel, Blocker). Wenn ein Pinned Intel existiert, ist dies dein primärer Fokus. Weise direkt auf Blocker hin. Antworte extrem kurz (max 2 Sätze). Sei präzise und direkt. Nutze Google Search für aktuelle Informationen.",
        }
      });

      let aiText = response.text || "Ich konnte keine Antwort generieren.";
      
      // Append grounding sources if available
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
          .map(chunk => chunk.web ? `[${chunk.web.title}](${chunk.web.uri})` : null)
          .filter(Boolean);
        
        if (sources.length > 0) {
          aiText += "\n\n**Quellen:**\n" + sources.join("\n");
        }
      }
      
      const aiLog: LogEntry = {
        id: (Date.now() + 1).toString(),
        sender: 'DT',
        text: aiText,
        timestamp: Date.now()
      };
      setLogs(prev => [...prev, aiLog]);
      if (surrealStatus === 'connected') {
        surrealService.saveLog(aiLog).catch(console.error);
      }

      // --- STRUCTURED CLASSIFIER (Second Call) ---
      if (surrealStatus === 'connected' && apiKey) {
        try {
          // 1. Keyword Parser (Deterministic Fallback)
          let manualType: string | null = null;
          let manualArea: string | null = null;
          let manualStatus: string | null = null;
          let manualImpact: number | null = null;

          const textUpper = text.toUpperCase();
          if (textUpper.startsWith('PROJEKT:')) manualType = 'Projekt';
          else if (textUpper.startsWith('ERKENNTNIS:')) manualType = 'Erkenntnis';
          else if (textUpper.startsWith('IDEE:')) manualType = 'Idee';
          else if (textUpper.startsWith('ZIEL:')) manualType = 'Ziel';
          else if (textUpper.startsWith('MISSION:')) manualType = 'Mission';

          // Simple extracting for Area/Status/Impact from text if present
          if (textUpper.includes('BEREICH:')) {
            const match = textUpper.match(/BEREICH:\s*(\w+)/);
            if (match) manualArea = match[1].toLowerCase();
          }
          if (textUpper.includes('STATUS:')) {
            const match = text.match(/Status:\s*([^.]+)/i);
            if (match) manualStatus = match[1].trim();
          }
          if (textUpper.includes('IMPACT:')) {
            const match = text.match(/Impact:\s*(\d+)/i);
            if (match) manualImpact = parseInt(match[1]);
          }

          const classificationPrompt = `
            Analysiere die folgende Nachricht des Nutzers und entscheide, ob es sich um eine wertvolle Information handelt, die in der Datenbank gespeichert werden sollte.
            
            NACHRICHT: "${text}"
            
            Klassifiziere nach:
            - type: Eines aus 'Seed','Projekt','Erkenntnis','Mission','Workflow','Idee','Kunde','Ziel','Academy','Toolbox','None'.
            - area: Eines aus 'health','dev','business','finance','mindset','islam','none'.
            - status: Eines aus 'Offen','In Arbeit','Blockiert','Abgeschlossen','Archiviert'.
            - impact: Eine Zahl von 1-10.
            - category: Eine Kurzbezeichnung für den Impact (z.B. 'GAME CHANGER' bei Impact >= 8, 'SOLID WORK' bei >= 4, sonst 'NOISE').
            - reasoning: Eine kurze Begründung für die Einordnung.
            - name: Ein kurzer, prägnanter Name für diesen Eintrag (max 5 Wörter).
            - nextStep: Was ist der nächste logische Schritt? (optional, falls sinnvoll).
            
            Wichtig: Wähle 'None', wenn die Nachricht nur Smalltalk oder eine Frage ohne neuen Dateninhalt ist.
          `;

          const classificationSchema: any = {
            type: "object",
            properties: {
              type: { type: "string" },
              area: { type: "string" },
              status: { type: "string" },
              impact: { type: "number" },
              category: { type: "string" },
              reasoning: { type: "string" },
              name: { type: "string" },
              nextStep: { type: "string" }
            },
            required: ["type", "area", "status", "impact", "category", "reasoning", "name"]
          };

          const classifierResult = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: classificationPrompt }] }],
            config: {
              responseMimeType: "application/json",
              responseSchema: classificationSchema,
            }
          });

          const classification = JSON.parse(classifierResult.text || '{}');
          
          // Use manual override if keyword was used
          const finalType = manualType || classification.type;
          
          if (classification && finalType && finalType !== 'None') {
            const impactValue = manualImpact || Number(classification.impact) || 5;
            const vaultRecord: any = {
              id: Math.random().toString(36).substring(7),
              text: text,
              name: classification.name || (text.length > 50 ? text.substring(0, 47) + '...' : text),
              score: impactValue,
              impact: impactValue,
              category: classification.category || (impactValue >= 8 ? 'GAME CHANGER' : impactValue >= 4 ? 'SOLID WORK' : 'NOISE'),
              reasoning: classification.reasoning || '',
              nextStep: classification.nextStep || '',
              timestamp: new Date().toISOString(),
              area: manualArea || classification.area || 'dev',
              pillarId: manualArea || (classification.area === 'none' ? 'dev' : (classification.area || 'dev')),
              status: manualStatus || classification.status || 'Offen',
              type: finalType,
              isArchived: false
            };

            console.log('VaultRecord built for SurrealDB:', JSON.stringify(vaultRecord, null, 2));

            // Map and save
            let savePromise: Promise<any> | null = null;
            let targetVault = '';

            switch (finalType) {
              case 'Seed': 
                vaultRecord.vaultId = 'ideen';
                savePromise = surrealService.saveSeed(vaultRecord);
                targetVault = 'Seeds';
                break;
              case 'Projekt':
                vaultRecord.vaultId = 'projekte';
                savePromise = surrealService.saveProject(vaultRecord);
                targetVault = 'Projekte';
                break;
              case 'Erkenntnis':
                vaultRecord.vaultId = 'erkenntnisse';
                savePromise = surrealService.saveErkenntnis(vaultRecord);
                targetVault = 'Erkenntnisse';
                break;
              case 'Workflow':
                vaultRecord.vaultId = 'workflows';
                savePromise = surrealService.saveWorkflow(vaultRecord);
                targetVault = 'Workflows';
                break;
              case 'Idee':
                vaultRecord.vaultId = 'ideen';
                savePromise = surrealService.saveIdee(vaultRecord);
                targetVault = 'Ideen';
                break;
              case 'Kunde':
                vaultRecord.vaultId = 'kunden';
                savePromise = surrealService.saveKunde(vaultRecord);
                targetVault = 'Kunden';
                break;
              case 'Ziel':
                vaultRecord.vaultId = 'ziele';
                savePromise = surrealService.saveZiel(vaultRecord);
                targetVault = 'Ziele';
                break;
              case 'Academy':
                vaultRecord.vaultId = 'academy';
                savePromise = surrealService.saveAcademyItem(vaultRecord);
                targetVault = 'Academy';
                break;
              case 'Toolbox':
                vaultRecord.vaultId = 'toolbox';
                savePromise = surrealService.saveToolboxItem(vaultRecord);
                targetVault = 'Toolbox';
                break;
              case 'Mission':
                vaultRecord.vaultId = 'ziele';
                savePromise = surrealService.saveMission(vaultRecord);
                targetVault = 'Missionen';
                break;
            }

            if (savePromise) {
              const result = await savePromise;
              console.log(`SurrealDB Save Response (${finalType}):`, result);
              
              const classificationLog: LogEntry = {
                id: (Date.now() + 5).toString(),
                sender: 'System',
                text: `→ Automatisch eingeordnet als ${finalType} (${vaultRecord.area}, Impact ${vaultRecord.impact}). Gespeichert in ${targetVault}.`,
                timestamp: Date.now()
              };
              setLogs(prev => [...prev, classificationLog]);
              surrealService.saveLog(classificationLog).catch(console.error);
              showNotification(`Item als ${finalType} in ${targetVault} gespeichert`, 'success');
            }
          }
        } catch (classifierErr) {
          console.error('Classification Error:', classifierErr);
        }
      }
    } catch (err) {
      console.error('Chat Error:', err);
      showNotification('Fehler beim Chatten mit DT.', 'warn');
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

  const handleSuggestNextTask = useCallback(async (analyzedItems: AnalyzedItem[]) => {
    if (isChatting) return;
    
    const topGameChanger = analyzedItems
      .filter(item => item.category === 'GAME CHANGER')
      .sort((a, b) => b.score - a.score)[0];
      
    const mission = missionInput || 'Keine aktive Mission eingeloggt.';
    
    setIsChatting(true);
    
    try {
      const apiKey = getEnv('VITE_GEMINI_API_KEY');
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Du bist DT (Strategie-Modus). 
        Basierend auf der aktuellen Aktiven Mission und dem wichtigsten Game Changer, schlage den EINEN nächsten, höchst-impactvollen Schritt vor.
        
        AKTIVE MISSION: ${mission}
        TOP GAME CHANGER: ${topGameChanger ? `[${topGameChanger.vaultId.toUpperCase()}] ${topGameChanger.text} (Score: ${topGameChanger.score})` : 'Kein Game Changer vorhanden.'}
        
        BILLBOARD-KONTEXT:
        - INTEL: ${pinnedIntelItems?.map(i => i.text).join(', ') || 'Keine'}
        - BLOCKER: ${pinnedBlockerItems?.map(i => i.text).join(', ') || 'Keine'}
        
        Antworte extrem kurz, direkt und handlungsorientiert (max. 2 Sätze).
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const aiText = response.text || "Ich konnte keinen nächsten Schritt identifizieren.";
      
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'DT (Strategie)',
        text: `🎯 STRATEGIE-VORSCHLAG:\n\n${aiText}`,
        timestamp: Date.now()
      }]);
      
      showNotification('Strategie-Vorschlag generiert.', 'success');
    } catch (err) {
      console.error('Strategy Suggestion Error:', err);
      showNotification('Fehler beim Generieren des Vorschlags.', 'warn');
    } finally {
      setIsChatting(false);
    }
  }, [isChatting, missionInput, pinnedBlockerItems, pinnedIntelItems, setLogs, showNotification]);

  return {
    chatInput,
    setChatInput,
    isChatting,
    setIsChatting,
    handleChatSubmit,
    handleSuggestNextTask
  };
}
