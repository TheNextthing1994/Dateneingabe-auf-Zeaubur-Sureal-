import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { Surreal, StringRecordId } from 'surrealdb';

dotenv.config();

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

// Hermes Agent Configuration
const HERMES_API_BASE_URL = process.env.HERMES_API_BASE_URL || 'http://76.13.151.81:8642/v1';
const HERMES_API_KEY = process.env.HERMES_API_KEY || '';
const HERMES_MODEL = process.env.HERMES_MODEL || 'hermes-agent';
const HERMES_TIMEOUT_MS = parseInt(process.env.HERMES_TIMEOUT_MS || '60000');
const HERMES_SESSION_PREFIX = process.env.HERMES_SESSION_PREFIX || 'dt_';

async function startServer() {
  console.log('Starting D.T. Kern Server...');
  console.log(`[Config] Hermes Target URL: ${HERMES_API_BASE_URL}`);
  if (HERMES_API_BASE_URL.startsWith('http:')) {
    console.warn('[Security] Hermes endpoint is using HTTP. Consider Reverse Proxy + HTTPS.');
  }

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
  app.use(express.json());

  // Generic SurrealDB Tools (Proxied through backend for D.T)
  app.post('/api/surreal/query', async (req, res) => {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });
    const { query, vars } = req.body;
    try {
      const result = await (db as any).query(query, vars);
      res.json({ success: true, result });
    } catch (err: any) {
      console.error('[Surreal] Query error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/surreal/create', async (req, res) => {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });
    const { collection, data } = req.body;
    try {
      const result = await (db as any).create(collection, data);
      res.json({ success: true, result });
    } catch (err: any) {
      console.error('[Surreal] Create error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/surreal/update', async (req, res) => {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });
    const { recordId, data } = req.body;
    try {
      const rid = recordId.includes(':') ? new StringRecordId(recordId) : recordId;
      const result = await (db as any).merge(rid, data);
      res.json({ success: true, result });
    } catch (err: any) {
      console.error('[Surreal] Update error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/surreal/delete', async (req, res) => {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });
    const { recordId } = req.body;
    try {
      const rid = recordId.includes(':') ? new StringRecordId(recordId) : recordId;
      await (db as any).delete(rid);
      res.json({ success: true, message: `Record ${recordId} deleted` });
    } catch (err: any) {
      console.error('[Surreal] Delete error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/surreal/select', async (req, res) => {
    if (!db) return res.status(503).json({ success: false, error: 'Database not connected' });
    const { thing } = req.body;
    try {
      const result = await (db as any).select(thing);
      res.json({ success: true, result });
    } catch (err: any) {
      console.error('[Surreal] Select error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get('/api/youtube/transcript', async (req, res) => {
    const videoUrl = req.query.url as string;
    console.log(`[API] Received transcript request for: ${videoUrl}`);
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing YouTube URL' });
    }

    // Extract Video ID
    let videoId = '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = videoUrl.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = videoUrl; // Fallback to raw string if it's just the ID
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
      
      // Fallback: Try to get metadata (Title/Description)
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

  // Hermes Health Check Proxy
  app.get('/api/hermes/health', async (req, res) => {
    try {
      const modelsUrl = `${HERMES_API_BASE_URL}/models`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); 

      const startTime = Date.now();
      const response = await fetch(modelsUrl, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(HERMES_API_KEY ? { 'Authorization': `Bearer ${HERMES_API_KEY}` } : {})
        }
      });

      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;
      
      console.log(`[Hermes] GET ${modelsUrl} -> ${response.status} (${durationMs}ms)`);

      if (!response.ok) {
        return res.json({ 
          online: false, 
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          url: HERMES_API_BASE_URL 
        });
      }

      res.json({ 
        online: true, 
        status: response.status,
        url: HERMES_API_BASE_URL 
      });
    } catch (e: any) {
      console.error(`[Hermes] Health check failed for ${HERMES_API_BASE_URL}:`, e.message);
      res.json({ online: false, error: e.message, url: HERMES_API_BASE_URL });
    }
  });

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

    // Build the prompt for Hermes
    const fullSessionId = `${HERMES_SESSION_PREFIX}${sessionId}`;
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
    const chatUrl = `${HERMES_API_BASE_URL}/chat/completions`;
    try {
      console.log(`[Hermes] POST ${chatUrl} (Streaming) -> (waiting)`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HERMES_TIMEOUT_MS);

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hermes-Session-Id': fullSessionId,
          ...(HERMES_API_KEY ? { 'Authorization': `Bearer ${HERMES_API_KEY}` } : {})
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: HERMES_MODEL, 
          messages: [
            { role: 'user', content: hermesPrompt }
          ],
          temperature: 0.7,
          stream: true
        })
      });

      clearTimeout(timeout);

      // Handle 4xx Errors - Do NOT fallback for client/auth errors
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Hermes] Client Error ${response.status}:`, errorData);
        return res.status(response.status).json({
          success: false,
          error: `Hermes hat die Anfrage abgelehnt (Fehler ${response.status}).`,
          details: errorData.error || response.statusText
        });
      }

      if (!response.ok) {
        throw new Error(`Hermes API error: ${response.status} ${response.statusText}`);
      }

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      if (!response.body) throw new Error("No response body from Hermes");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);

        // Optional: Extract content for logging later if needed
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const json = JSON.parse(line.slice(6));
              fullContent += json.choices?.[0]?.delta?.content || "";
            } catch (e) {}
          }
        }
      }

      res.end();
      const durationMs = Date.now() - startTime;
      console.log(`[Hermes] Stream finished (${durationMs}ms)`);

      // Log to SurrealDB (Async, don't wait for it to finish the request)
      logAndSendHermesResponse(null, db, { 
        userId, 
        sessionId, 
        userMessage, 
        hermesPrompt, 
        hermesResponse: fullContent, 
        durationMs,
        isAsyncLog: true 
      });

    } catch (error: any) {
      console.error(`[Hermes] Connection failed: ${error.message}`);
      
      res.status(500).json({ 
        success: false, 
        error: 'Hermes ist aktuell nicht erreichbar.',
        details: error.message
      });
    }
  });

  async function logAndSendHermesResponse(res: any, db: any, params: any) {
    const { userId, sessionId, userMessage, hermesPrompt, hermesResponse, durationMs, isFallback = false, isAsyncLog = false } = params;
    
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
          durationMs,
          isFallback
        });
      } catch (logErr) {
        console.error('[Surreal] Logging Hermes call failed:', logErr);
      }
    }
    
    if (res && !isAsyncLog) {
      res.json({ 
        success: true, 
        response: hermesResponse,
        durationMs,
        isFallback
      });
    }
  }


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
