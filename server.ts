import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { paymentRouter, handleMpesaCallback } from './src/server/paymentRoutes.js';
import { studioRouter } from './src/server/studioRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mount Safaricom Daraja M-Pesa & Vault payment engine routes
  app.use('/api/payments', paymentRouter);
  app.post('/api/mpesa/callback', handleMpesaCallback);
  app.use('/api/studio', studioRouter);
  app.use('/api', paymentRouter); // Mounts /api/photos/:photoId/download and /api/orders/lookup

  // Initialize Gemini client strictly on server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const SYSTEM_INSTRUCTION = `You are the Vault Event Photography Concierge for Kenya.
Vault is Kenya's leading event photography digital commerce platform operating in Kenyan Shillings (KES) with Safaricom Lipa Na M-Pesa Online integration.
Your role:
1. Help attendees/customers locate their graduation, wedding, sports marathon, or conference photos using unique Photo Codes (e.g., UON-002, WED-101) or bib numbers.
2. Explain the M-Pesa STK push checkout flow, instant verification, and the 30-day unwatermarked 24MP master download guarantee.
3. Help photographers configure their storefronts, upload photos with automated canvas watermarks, set suggested KES prices, configure bundle discounts, and understand the 10% platform commission and 90-day gallery retention rules.
4. Keep answers friendly, concise, professional, and knowledgeable about Kenyan events and M-Pesa commerce.`;

  // Multi-turn Gemini Chat Endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      // Convert history to contents format expected by Gemini SDK
      // history items: { role: 'user' | 'model', text: string }
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        for (const item of history) {
          if (item && item.text) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }],
            });
          }
        }
      }

      // Append current user message
      contents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // Call Gemini 3.5 Flash for general chat tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "I'm here to help with your event photos and M-Pesa checkout!";
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      res.status(500).json({
        error: 'Failed to generate response',
        details: err.message || 'Unknown error',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', platform: 'Vault' });
  });

  // Mount Vite development middlewares in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
