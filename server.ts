import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());

  // API proxy endpoint for Gemini AI
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ 
          error: "API Key is missing. Please configure GEMINI_API_KEY in the Settings > Secrets panel." 
        });
      }

      // Initialize Gemini SDK with telemetry User-Agent header as required
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = "You are an intelligent and encouraging AI personal resource optimization coach for the EcoSync ecosystem. Help the user structure their energy consumption, schedule appliance usage during off-peak windows, minimize water leaks, and optimize overall carbon offsets. Keep your answers clear, concise, structured, and visually engaging in Indonesian language. Feel free to use markdown format.";

      // Create or continue conversation chat session
      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction,
        },
        history: history || []
      });

      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with Gemini AI." });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    // Serve production static assets
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    // Vite Dev server integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync('index.html', 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
  });
}

startServer();
