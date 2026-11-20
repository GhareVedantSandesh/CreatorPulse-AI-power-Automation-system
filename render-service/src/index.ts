import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

dotenv.config();

const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const STORAGE_ROOT = path.join(__dirname, '../../storage');

app.post('/render', async (req: Request, res: Response) => {
    const { slide_id, payload } = req.body;
    
    if (!slide_id || !payload) {
        return res.status(400).json({ error: 'Missing slide_id or payload' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { margin: 0; padding: 0; background: ${payload.theme?.background || '#0f172a'}; color: white; font-family: sans-serif; }
                    .slide-container { width: 1080px; height: 1080px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 80px; text-align: center; }
                    .title { font-size: 80px; font-weight: 800; line-height: 1.1; margin-bottom: 40px; }
                    .body { font-size: 48px; line-height: 1.4; opacity: 0.9; }
                </style>
            </head>
            <body>
                <div class="slide-container">
                    <div class="title">${payload.content?.title || payload.content?.heading || ''}</div>
                    <div class="body">${payload.content?.body || payload.content?.subtext || ''}</div>
                </div>
            </body>
            </html>
        `;

        await page.setContent(html);
        const screenshot = await page.screenshot({ type: 'png' });

        const relativePath = `slides/${slide_id}.png`;
        const fullPath = path.join(STORAGE_ROOT, relativePath);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        
        // Save to local file
        await fs.writeFile(fullPath, screenshot);

        res.json({ success: true, storage_path: relativePath });

    } catch (error: any) {
        console.error('Render error:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.RENDER_PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Local Render service running on port ${PORT}`);
});
