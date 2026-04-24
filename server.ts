import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { YoutubeTranscript } = require('youtube-transcript');

async function startServer() {
  console.log('Starting D.T. Kern Server...');
  const app = express();
  const PORT = 3000;

  // API Routes
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
      
      // Try to fetch transcript
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
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
