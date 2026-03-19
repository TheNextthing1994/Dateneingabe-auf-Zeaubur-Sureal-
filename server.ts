import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  console.log('Starting D.T. Kern Server...');
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get('/api/youtube/transcript', async (req, res) => {
    const videoUrl = req.query.url as string;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing YouTube URL' });
    }

    try {
      console.log(`Fetching transcript for: ${videoUrl}`);
      // Import the ESM version directly to avoid CJS/ESM conflict in the library
      const { YoutubeTranscript } = await import('youtube-transcript/dist/youtube-transcript.esm.js');
      const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
      
      const fullText = transcript.map(part => part.text).join(' ');
      
      res.json({ 
        transcript: fullText,
        parts: transcript.length
      });
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transcript', 
        details: error.message 
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
