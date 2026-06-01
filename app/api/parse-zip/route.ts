import { NextResponse } from 'next/server';
import JSZip from 'jszip';
// @ts-ignore
import PDFParser from 'pdf2json';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        
        try {
            await zip.loadAsync(arrayBuffer);
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Invalid ZIP file format' }, { status: 400 });
        }

        const students: any[] = [];
        
        const pdfFiles = Object.keys(zip.files).filter(filename => filename.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length === 0) {
            return NextResponse.json({ success: false, error: 'Tidak ada file PDF di dalam ZIP ini.' }, { status: 400 });
        }

        for (const filename of pdfFiles) {
            const fileData = zip.files[filename];
            if (!fileData.dir) {
                try {
                    const pdfBuffer = await fileData.async('nodebuffer');
                    
                    const text: string = await new Promise((resolve, reject) => {
                        const pdfParser = new PDFParser(null, 1 as any);
                        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
                        pdfParser.on("pdfParser_dataReady", () => {
                            resolve(pdfParser.getRawTextContent());
                        });
                        pdfParser.parseBuffer(pdfBuffer);
                    });
                    
                    const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                    
                    // Format Kartu SNBT/SNBP (baris ke-1: No Peserta, ke-2: Nama, ke-3: TTL)
                    if (lines.length >= 3) {
                        const rawNo = lines[0];
                        const rawNama = lines[1];
                        const rawTtl = lines[2];

                        // Validasi sederhana: No peserta mengandung angka, TTL ada angka & strip
                        if (/\d/.test(rawNo) && /\d/.test(rawTtl)) {
                            const noPeserta = rawNo.replace(/-/g, '');
                            let ttl = rawTtl.replace(/[-/]/g, '');
                            
                            if (ttl.length === 8 && /^\d+$/.test(noPeserta)) {
                                students.push({
                                    "Nama": rawNama,
                                    "No Peserta": noPeserta,
                                    "Tanggal Lahir": ttl
                                });
                            }
                        }
                    }
                } catch (pdfErr) {
                    console.error('Error parsing PDF:', filename, pdfErr);
                    // Skip corrupt PDFs
                }
            }
        }

        return NextResponse.json({ success: true, students });

    } catch (error: any) {
        console.error('Parse ZIP Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
