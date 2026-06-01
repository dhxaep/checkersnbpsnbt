import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Global browser to avoid launching on every request
let globalBrowser: any = null;

async function getBrowser() {
    if (!globalBrowser) {
        const isDev = process.env.NODE_ENV === 'development';
        let executablePath = '';

        if (isDev) {
            // Local Windows Chrome paths for 'npm run dev'
            const paths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
            ];
            const fs = require('fs');
            for (const p of paths) {
                if (fs.existsSync(p)) {
                    executablePath = p;
                    break;
                }
            }
        } else {
            // Serverless Netlify environment
            executablePath = await chromium.executablePath();
        }

        globalBrowser = await puppeteer.launch({
            args: isDev ? [] : chromium.args,
            defaultViewport: { width: 1920, height: 1080 },
            executablePath: executablePath,
            headless: true,
        });
    }
    return globalBrowser;
}

function hashString(e: string) {
    let t = 0;
    const a = e.length;
    let n = 0;
    if (a > 0) {
        for (; n < a;) t = (t << 5) - t + e.charCodeAt(n++) | 0;
    }
    return t;
}

function getPath(e: string) {
    const t = hashString(e);
    return (255 & t).toString().padStart(3, "0") + "/" + ((t >> 8) & 255).toString().padStart(3, "0");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mode, noPeserta, ttl } = body;

        if (!noPeserta || !ttl) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        if (mode === 'snbp') {
            try {
                const browser = await getBrowser();
                const context = await browser.createBrowserContext();
                const page = await context.newPage();
                let interceptedData: any = null;
                let hasIntercepted = false;
                
                page.on('response', async (res: any) => {
                    const url = res.url();
                    if (url.includes('.json') && !url.includes('config')) {
                        if (res.status() === 200) {
                            try {
                                interceptedData = await res.json();
                                hasIntercepted = true;
                            } catch (e) {
                                hasIntercepted = true;
                            }
                        } else {
                            hasIntercepted = true;
                        }
                    }
                });

                await page.goto('https://snbp.ipb.ac.id/?renderer=html', { waitUntil: 'domcontentloaded', timeout: 15000 });
                await new Promise(r => setTimeout(r, 300));
                
                const dd = ttl.substring(0, 2);
                const mm = ttl.substring(2, 4);
                const yyyy = ttl.substring(4, 8);

                await page.type('#index-form-registration-number', noPeserta);
                await page.type('#index-form-birthday-day', dd);
                await page.type('#index-form-birthday-month', mm);
                await page.type('#index-form-birthday-year', yyyy);
                
                await page.click('#index-form-submit');
                
                // Wait for max 5 seconds for the json to be intercepted
                for (let i = 0; i < 50; i++) {
                    if (hasIntercepted) break;
                    await new Promise(r => setTimeout(r, 100));
                }

                await page.close();
                await context.close();

                if (interceptedData) {
                    return NextResponse.json({
                        ac: 1,
                        kpt: interceptedData.ac?.ku || '',
                        npt: interceptedData.ac?.pt || '',
                        kps: interceptedData.ac?.kp || '',
                        nps: interceptedData.ac?.pr || '',
                        na: interceptedData.na || '',
                        sch: interceptedData.se || ''
                    });
                }
                
                return NextResponse.json({ ac: 0 }); // 404 or no valid JSON = Tidak Lulus
                
            } catch (error) {
                console.error('Puppeteer Error:', error);
                return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
            }
        }

        // --- SNBT LOGIC ---
        // Ensure ttl is exactly 8 digits by padding zeroes
        const cleanTtl = String(ttl).trim().padStart(8, '0');
        const combined = String(noPeserta).trim() + cleanTtl;
        const path = getPath(combined);

        // Determine correct base URL
        const baseUrl = 'https://storage.googleapis.com/pengumuman-snbt-2026-prod-ebo3nu41z69f';
            
        const targetUrl = `${baseUrl}/data/data/${path}/${combined}.dwg`;

        const response = await fetch(targetUrl, { cache: 'no-store' });
        
        if (!response.ok) {
            return NextResponse.json({ ac: 0 }); // 404 = Tidak Lulus
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
