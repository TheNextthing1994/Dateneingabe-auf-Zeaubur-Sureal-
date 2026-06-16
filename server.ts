import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { Surreal, StringRecordId } from 'surrealdb';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Custom YouTube Transcript Fetcher (Minimal implementation to avoid buggy library)
async function fetchYoutubeTranscript(videoId: string) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    const html = await response.text();
    
    // Look for caption track info
    const match = html.match(/"captionTracks":\[(.*?)]/);
    if (!match) throw new Error('No transcripts available for this video');
    
    const tracks = JSON.parse(`[${match[1]}]`);
    if (!tracks.length) throw new Error('No transcript tracks found');
    
    // Prefer German, then English, then first available
    const track = tracks.find((t: any) => t.languageCode === 'de') || 
                  tracks.find((t: any) => t.languageCode === 'en') || 
                  tracks[0];
    
    const transcriptRes = await fetch(track.baseUrl);
    const xml = await transcriptRes.text();
    
    // Simple XML text extraction
    const lines = xml.match(/<text[^>]*>(.*?)<\/text>/g);
    if (!lines) return [];
    
    return lines.map(line => {
      const text = line.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const startMatch = line.match(/start="([\d.]+)"/);
      return {
        text,
        start: startMatch ? parseFloat(startMatch[1]) : 0
      };
    });
  } catch (error) {
    console.error('Custom Transcript Fetch Error:', error);
    throw error;
  }
}

async function startServer() {
  console.log('Starting D.T. Kern Server...');
  const app = express();
  const PORT = 3000;

  // SurrealDB Connection for Backend Logging
  let db: Surreal | null = null;
  const connectSurreal = async () => {
    if (!process.env.VITE_SURREALDB_URL) return null;
    try {
      const client = new Surreal();
      let url = process.env.VITE_SURREALDB_URL.trim();
      if (url.startsWith('https://')) url = url.replace('https://', 'wss://');
      if (url.startsWith('http://')) url = url.replace('http://', 'ws://');
      
      await client.connect(url);
      if (process.env.VITE_SURREALDB_USER && process.env.VITE_SURREALDB_PASS) {
        await (client as any).signin({
          username: process.env.VITE_SURREALDB_USER,
          password: process.env.VITE_SURREALDB_PASS,
        });
      }
      await (client as any).use({ 
        ns: process.env.VITE_SURREALDB_NS || 'test', 
        db: process.env.VITE_SURREALDB_DB || 'test' 
      });
      console.log('[Surreal] Backend successfully connected for logging');
      return client;
    } catch (e) {
      console.error('[Surreal] Backend connection failed:', e);
      return null;
    }
  };

  db = await connectSurreal();

  // API Routes
  app.get('/api/youtube/transcript', async (req, res) => {
    const videoUrl = (req.query.url as string) || ''; const searchTitle = (req.query.title as string) || ''; const searchChannel = (req.query.channel as string) || '';
    console.log(`[API] Received transcript request for: ${videoUrl}`);
    
    if (!videoUrl && !searchTitle) {
      return res.status(400).json({ error: 'Missing YouTube URL or title' });
    }

    // Extract Video ID
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      if (videoUrl && /^[a-zA-Z0-9_-]{11}$/.test(videoUrl)) { videoId = videoUrl; } else if (searchTitle) { try { const q = encodeURIComponent(`${searchTitle} ${searchChannel}`.trim()); const sr = await fetch(`https://www.youtube.com/results?search_query=${q}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'de,en' } }); const sh = await sr.text(); const vm = sh.match(/"videoId":"([a-zA-Z0-9_-]{11})"/); if (vm) { videoId = vm[1]; console.log(`[API] Resolved videoId ${videoId} from title search: ${searchTitle}`); } } catch (e) { console.error('[API] Title search failed:', e); } }
    }

    try {
      console.log(`[API] Fetching transcript for Video ID: ${videoId}`);
      
      // Try to fetch transcript using custom implementation
      const transcript = await fetchYoutubeTranscript(videoId);
      const fullText = transcript.map((part: any) => part.text).join(' ');
      
      console.log(`[API] Successfully fetched transcript for ${videoId} (${transcript.length} parts)`);
      res.json({ 
        transcript: fullText,
        parts: transcript.length,
        videoId,
        source: 'transcript',
        success: true
      });
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      const isTranscriptDisabled = errorMessage.includes('Transcript is disabled') || errorMessage.includes('No transcripts are available');
      
      if (isTranscriptDisabled) {
        console.log(`[API] Transcript is disabled for ${videoId}. Switching to metadata fallback...`);
      } else {
        console.warn(`[API] Transcript fetch error for ${videoId}:`, errorMessage);
      }
      
      try { const HERMES_BASE = process.env.HERMES_API_BASE_URL || 'http://127.0.0.1:8642/v1'; const HERMES_KEY = process.env.HERMES_API_KEY || ''; console.log(`[API] Trying Hermes transcript fallback for ${videoId}`); const hRes = await fetch(`${HERMES_BASE}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(HERMES_KEY ? { 'Authorization': `Bearer ${HERMES_KEY}` } : {}) }, body: JSON.stringify({ model: 'hermes', messages: [{ role: 'user', content: `Besorge das vollständige Transkript dieses YouTube-Videos mit allen verfügbaren Methoden (Untertitel, Schatten-Quellen, eigene Whisper-Transkription). Antworte NUR mit dem reinen Transkript-Text. Video-ID: ${videoId}. URL: https://www.youtube.com/watch?v=${videoId}. Titel: ${searchTitle}. Kanal: ${searchChannel}` }], temperature: 0 }) }); if (hRes.ok) { const hData = await hRes.json(); const hText = (hData && hData.choices && hData.choices[0] && hData.choices[0].message && hData.choices[0].message.content || '').trim(); if (hText && hText.length > 40) { console.log(`[API] Hermes provided transcript for ${videoId}`); return res.json({ transcript: hText, parts: hText.split('. ').length, isMetadataOnly: false, videoId, source: 'hermes', success: true }); } } } catch (hermesErr) { console.error('[API] Hermes transcript fallback failed:', hermesErr); }
      try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        const html = await response.text();
        
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Video';
        
        let description = '';
        const descriptionMatch = html.match(/"shortDescription":"(.*?)"/);
        if (descriptionMatch) {
          description = descriptionMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        } else {
          const metaDescMatch = html.match(/meta name="description" content="(.*?)"/);
          description = metaDescMatch ? metaDescMatch[1] : '';
        }

        console.log(`[API] Metadata fallback successful for ${videoId}: "${title}"`);
        return res.json({ 
          transcript: `TITEL: ${title}\n\nBESCHREIBUNG: ${description}\n\n[HINWEIS: Das Transkript ist für dieses Video nicht verfügbar. Nutze Metadaten und visuelle Analyse.]`,
          parts: 0,
          isMetadataOnly: true,
          title,
          videoId,
          source: 'metadata',
          success: true
        });
      } catch (fallbackErr) {
        console.error(`[API] All fetch attempts failed for ${videoId}:`, fallbackErr);
        res.status(200).json({ 
          transcript: "Keine Transkript- oder Metadaten verfügbar.",
          error: 'Failed to fetch any data from YouTube', 
          details: errorMessage,
          videoId,
          success: false,
          isMetadataOnly: false,
          parts: 0
        });
      }
    }
  });

  // Hermes API Integration
  app.use(express.json()); // Ensure JSON body parsing is active

  app.post('/api/hermes/call', async (req, res) => {
    const { 
      userMessage, 
      sessionId = 'default-session', 
      userId = 'default-user',
      context = '',
      capabilitiesNeeded = [],
      responseMode = 'final_only',
      saveToMemory = false,
      writeToObsidian = false
    } = req.body;

    console.log(`[Hermes] Received call for session ${sessionId}, user ${userId}`);

    const HERMES_API_BASE_URL = process.env.HERMES_API_BASE_URL || 'http://127.0.0.1:8642/v1';
    const HERMES_API_KEY = process.env.HERMES_API_KEY || '';

    // Build the prompt for Hermes as requested by user
    const hermesPrompt = `Du bist Hermes, der Backend-Operator von D.T.
Der Nutzer spricht gerade mit D.T. über Gemini Live.
Bearbeite die Anfrage als ausführender Agent nur dann mit Tools und Workflows, wenn es nötig ist.
Antworte standardmäßig auf Deutsch.
Wenn Kontext mitgegeben wurde, berücksichtige ihn.
Wenn saveToMemory=true, darfst du wichtige dauerhafte Nutzerdetails speichern.
Wenn writeToObsidian=true, darfst du relevante Ergebnisse in Obsidian schreiben.
Wenn capabilitiesNeeded gesetzt ist, nutze das als Hinweis für die Art der benötigten Fähigkeiten.

User ID: ${userId}
Session ID: ${sessionId}
Capabilities needed: ${capabilitiesNeeded.join(', ')}
Additional context:
${context}

Nutzeranfrage:
${userMessage}

Bitte liefere eine klare finale Antwort für den Nutzer zurück.`;

    const startTime = Date.now();
    try {
      const response = await fetch(`${HERMES_API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hermes-Session-Id': sessionId,
          ...(HERMES_API_KEY ? { 'Authorization': `Bearer ${HERMES_API_KEY}` } : {})
        },
        body: JSON.stringify({
          model: 'hermes', // Or appropriate model name
          messages: [
            { role: 'user', content: hermesPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Hermes API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const hermesResponse = data.choices?.[0]?.message?.content || 'Keine Antwort von Hermes erhalten.';
      const durationMs = Date.now() - startTime;

      console.log(`[Hermes] Success (${durationMs}ms)`);

      // Log to SurrealDB
      if (db) {
        try {
          const logId = `logs:${Math.random().toString(36).substring(7)}`;
          await (db as any).create(new StringRecordId(logId), {
            timestamp: Date.now(),
            userId,
            sessionId,
            toolName: 'callHermes',
            originalUserMessage: userMessage,
            hermesPrompt,
            hermesResponse,
            status: 'success',
            durationMs
          });
        } catch (logErr) {
          console.error('[Surreal] Logging Hermes call failed:', logErr);
        }
      }
      
      res.json({ 
        success: true, 
        response: hermesResponse,
        durationMs
      });
    } catch (error: any) {
      console.error('[Hermes] Error:', error);

      // Log error to SurrealDB
      if (db) {
        try {
          const logId = `logs:${Math.random().toString(36).substring(7)}`;
          await (db as any).create(new StringRecordId(logId), {
            timestamp: Date.now(),
            userId,
            sessionId,
            toolName: 'callHermes',
            originalUserMessage: userMessage,
            hermesPrompt,
            status: 'error',
            error: error.message
          });
        } catch (logErr) {
          console.error('[Surreal] Logging Hermes error failed:', logErr);
        }
      }

      res.status(500).json({ 
        success: false, 
        error: 'Ich kann die externe Operator-Funktion gerade nicht erreichen. Versuch es bitte gleich nochmal.',
        details: error.message
      });
    }
  });

  // API endpoint to fetch and parse Recall items
  app.post("/api/recall/sync", async (req, res) => {
    try {
      const { recallApiKey, customItems, dateFrom, dateTo } = req.body;
      let items = [];
      let methodUsed = "real_api";

      const cleanKey = (key?: string) => key ? key.trim() : "";
      const activeKey = cleanKey(recallApiKey) || process.env.RECALL_API_KEY || "sk_3c99fb6d4f5f05729f94d9f98377ed24";

      // If customItems are provided, use them directly (scratchpad mode)
      if (customItems && Array.isArray(customItems) && customItems.length > 0) {
        items = customItems;
        methodUsed = "custom";
      } else if (!activeKey || activeKey === "" || activeKey.toLowerCase() === "demo") {
        return res.status(400).json({
          error: "Ein gueltiger Recall API Token ist erforderlich. Bitte gib deinen echten API Token in den Einstellungen ein."
        });
      } else {
        const apiKey = activeKey;
        try {
          // Construct query parameters for Recall API
          let recallUrl = "https://backend.getrecall.ai/api/v1/cards";
          const queryParams = new URLSearchParams();

          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            if (!isNaN(fromDate.getTime())) {
              queryParams.append("date_from", fromDate.toISOString().split("T")[0] + "T00:00:00Z");
            }
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            if (!isNaN(toDate.getTime())) {
              queryParams.append("date_to", toDate.toISOString().split("T")[0] + "T23:59:59Z");
            }
          }

          const queryString = queryParams.toString();
          if (queryString) {
            recallUrl += `?${queryString}`;
          }

          console.log(`Fetching cards from Recall API: ${recallUrl}`);

          // Fetch list of cards using the exact specified URL and authorization scheme
          const response = await fetch(recallUrl, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Accept": "application/json"
            }
          });

          if (response.ok) {
            const listData = await response.json() as any;
            const cardList = listData.results || [];
            
            if (Array.isArray(cardList) && cardList.length > 0) {
              // Retrieve detailed content chunks for the first 5 cards to ensure deep synthesis by Gemini
              const cardPromises = cardList.slice(0, 5).map(async (card: any) => {
                try {
                  const cardDetailsResponse = await fetch(`https://backend.getrecall.ai/api/v1/cards/${card.id}`, {
                    method: "GET",
                    headers: {
                      "Authorization": `Bearer ${apiKey}`,
                      "Accept": "application/json"
                    }
                  });
                  
                  if (cardDetailsResponse.ok) {
                    const cardDetails = await cardDetailsResponse.json() as any;
                    const combinedContent = (cardDetails.chunks || [])
                      .map((ck: any) => ck.content || "")
                      .filter((txt: string) => txt.trim() !== "")
                      .join("\n");
                    
                    // Extract raw tags securely
                    const rawTags = cardDetails.tags || card.tags || [];
                    const tagsList = Array.isArray(rawTags)
                      ? rawTags.map((t: any) => {
                          if (typeof t === 'string') return t;
                          if (t && typeof t === 'object' && t.name) return t.name;
                          if (t && typeof t === 'object' && t.title) return t.title;
                          return "";
                        }).filter((t: string) => t.trim() !== "")
                      : [];
                    
                    return {
                      id: card.id,
                      title: card.title || "Untitled Card",
                      url: card.source_url || "",
                      summary: combinedContent || "No detailed content chunks loaded.",
                      created_at: cardDetails.created_at || card.created_at || new Date().toISOString(),
                      tags: tagsList
                    };
                  }
                } catch (detailErr) {
                  console.error(`Failed to load chunks for card ${card.id}:`, detailErr);
                }
                // Fallback to basic card info if chunks request failed
                const rawCardTags = card.tags || [];
                const fallbackTags = Array.isArray(rawCardTags)
                  ? rawCardTags.map((t: any) => {
                      if (typeof t === 'string') return t;
                      if (t && typeof t === 'object' && t.name) return t.name;
                      if (t && typeof t === 'object' && t.title) return t.title;
                      return "";
                    }).filter((t: string) => t.trim() !== "")
                  : [];

                return {
                  id: card.id,
                  title: card.title || "Untitled Card",
                  url: card.source_url || "",
                  summary: "Could not retrieve detailed chunks from API.",
                  created_at: card.created_at || new Date().toISOString(),
                  tags: fallbackTags
                };
              });
              
              items = await Promise.all(cardPromises);
              methodUsed = "real_api";
            } else {
              console.warn("Recall.it API returned zero cards.");
              items = [];
              methodUsed = "real_api_empty";
            }
          } else {
            const errData = await response.json().catch(() => ({})) as any;
            const errMsg = errData.detail?.message || `Recall.it API returned status code ${response.status}`;
            throw new Error(errMsg);
          }
        } catch (err: any) {
          console.error(`Recall.it API integration error: ${err.message}.`);
          return res.status(401).json({
            error: `Recall API Integration Error: ${err.message}. Please double check that your private token is correct.`
          });
        }
      }

      // Guard: if we somehow have no items, return empty list
      if (items.length === 0) {
        return res.json({
          itemsSyncedCount: 0,
          todosExtractedCount: 0,
          items: [],
          extractedTodos: [],
          methodUsed
        });
      }

      // Now, run the items through Gemini model to extract structured actionable todos
      const contents = `Analyze the following bookmarks and content summaries saved by a user.
For each item, identify if there are any immediate/logical tasks, further research topics, action steps, or watch/read checklist items.
Each item in the list might contain 'tags' representing user tags in their Recall account.

You MUST prioritize setting the 'category' of each extracted task to one of the actual tags of the bookmark.
If multiple tags exist, you must prioritize functional tags in this exact order:
1. "New Tool"
2. "Anwendungsfälle"
3. "Claude"
4. "Hermes"

If none of those priority tags are present but the bookmark has other tags, select the most relevant tag from its 'tags' list as the 'category'.
If the bookmark has absolutely no tags, analyze its contents: if it introduces or explains a new tool, service, or software library, use the category "New Tool". If it outlines practical applications or use cases, use the category "Anwendungsfälle". For conversations or models related to Claude, use "Claude". For Hermes or specialized reasoning models, use "Hermes". Otherwise, dynamically assign a concise and meaningful category name based on the content themes, keeping it capitalized.

AUTOMATED ACTION MODE (YOUR CORE ASSIGNMENT):
You must dynamically analyze the content template and choose the best suited Execution Mode ('executionMode') for the user:
- "Architect": Best for items that explain how a system works, how to configure or set up a tool, systematic tutorials, or architectural plans.
- "Rapid Prototyper": Best for items containing code, logic, APIs, boilerplates, schema files, or actionable programming snippets.
- "Strategist": Best for conceptual ideas, market opportunities, product strategies, monetization tactics, or creative brainstorms.

Based on the chosen Mode, you MUST provide a detailed markdown string in 'modeOutput':
- For Architect: Provide a high-fidelity Markdown structural Blueprint (Draft/Blueprint) followed by Step-by-Step implementation instructions.
- For Rapid Prototyper: Provide fully written, copy-ready Code Boilerplates (e.g., Python, Javascript/TS, or JSON configs) and short instructions on how to run them.
- For Strategist: Provide a comprehensive SWOT or market overview, 3+ extremely unique and targeted business Use Cases, and a specific risk-mitigation tip.

Structure each extracted task into a structured object containing:
- task (Short title of the task)
- description (Action guidelines, learning steps, or helpful context)
- priority (low, medium, or high)
- category (The selected key category tag name as described above)
- tags (The complete array of tags for this bookmark card)
- executionMode ("Architect", "Rapid Prototyper", or "Strategist")
- modeOutput (High-value markdown content containing code snippets, schemas, or blueprints ready for immediate action)
- sourceTitle (Title of the source bookmark)
- sourceUrl (The source link)

Only extract tasks that directly or logically arise from the saved summaries (or can be helpful next steps to follow up on the bookmark).

Here are the saved bookmarks (including their tags and summaries):
${JSON.stringify(items, null, 2)}`;

      const modelResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: "You are an expert action-item extractor and cognitive productivity companion. Your purpose is to turn casual bookmarks, youtube summaries, and pdf highlights from Recall.it into extremely structured, neat, prioritized board task items categorized by user tags.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task: { type: Type.STRING, description: "Short title of the task" },
                description: { type: Type.STRING, description: "Practical instructions, guidelines, list of concepts, or context from the source content" },
                priority: { type: Type.STRING, enum: ["low", "medium", "high"], description: "The priority of the task" },
                category: { type: Type.STRING, description: "Key tag name selected from the card's real tags, prioritizing 'New Tool', 'Anwendungsfälle', 'Claude', or 'Hermes'." },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "The complete list of tags present on this bookmark."
                },
                executionMode: { type: Type.STRING, enum: ["Architect", "Rapid Prototyper", "Strategist"], description: "The dynamically determined execution mode best suited for this task content." },
                modeOutput: { type: Type.STRING, description: "Detailed Markdown content. Code snippets for Rapid Prototyper, Blueprints & Steps for Architect, Use cases & Market analysis for Strategist." },
                sourceTitle: { type: Type.STRING, description: "The exact 'title' value of the source bookmark item in the JSON" },
                sourceUrl: { type: Type.STRING, description: "The exact 'url' value of the source bookmark item in the JSON" }
              },
              required: ["task", "priority", "category", "tags", "executionMode", "modeOutput", "sourceTitle", "sourceUrl"]
            }
          }
        }
      });

      const textOutput = modelResponse.text || "[]";
      const extractedTodos = JSON.parse(textOutput);

      return res.json({
        itemsSyncedCount: items.length,
        todosExtractedCount: extractedTodos.length,
        items,
        extractedTodos,
        methodUsed
      });

    } catch (error: any) {
      console.error("Recall Sync Error: ", error);
      res.status(500).json({
        error: error.message || "An error occurred during Recall.it synchronization"
      });
    }
  });

  // Vite middleware for development
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Initializing Vite middleware...');
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          host: '0.0.0.0',
          port: 3000
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware initialized.');
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } catch (viteErr) {
    console.error('Vite initialization error:', viteErr);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`>>> D.T. Kern Server is LIVE on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Failed to start server:', err);
});
