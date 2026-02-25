import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import PDFDocument from 'npm:pdfkit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TranslateRequest {
  documentId: string;
  targetLanguage: string;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const chunks = text.match(/.{1,500}/g) || [];
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0]) {
        const translated = data[0].map((item: any) => item[0]).join('');
        translatedChunks.push(translated);
      }
    }

    return translatedChunks.join('');
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  const uint8Array = new Uint8Array(pdfBuffer);
  const decoder = new TextDecoder('utf-8');
  let text = decoder.decode(uint8Array);

  text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');

  const lines = text.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !/^[\d\s<>\/\\]+$/.test(trimmed);
  });

  return lines.join('\n');
}

async function generatePDF(text: string): Promise<Uint8Array> {
  // Use PDFKit to create a valid PDF document from the translated text.
  return new Promise<Uint8Array>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ autoFirstPage: false });
      const chunks: Uint8Array[] = [];

      // Collect data chunks
      // @ts-ignore - PDFKit emits 'data' and 'end' in a Node-style stream
      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      // @ts-ignore
      doc.on('end', () => {
        // concat Uint8Arrays
        let length = 0;
        for (const c of chunks) length += c.length;
        const result = new Uint8Array(length);
        let offset = 0;
        for (const c of chunks) {
          result.set(c, offset);
          offset += c.length;
        }
        resolve(result);
      });

      // Add a page and write the text preserving line breaks
      const pageOptions = { size: 'A4', margin: 50 };
      doc.addPage(pageOptions);
      doc.font('Helvetica');
      doc.fontSize(12);

      const lines = text.split('\n');
      for (const line of lines) {
        doc.text(line, { continued: false });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function generateDOCX(text: string): Promise<Uint8Array> {
  const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${text.split('\n').map(line => `
    <w:p>
      <w:r>
        <w:t>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
      </w:r>
    </w:p>
    `).join('')}
  </w:body>
</w:document>`;

  const encoder = new TextEncoder();
  return encoder.encode(xmlContent);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId, targetLanguage }: TranslateRequest = await req.json();

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) throw docError;

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.original_file_path);

    if (downloadError) throw downloadError;

    const pdfBuffer = await pdfData.arrayBuffer();
    const extractedText = await extractTextFromPDF(pdfBuffer);

    const translatedText = await translateText(extractedText, targetLanguage);

    const pdfBuffer2 = await generatePDF(translatedText);
    const docxBuffer = await generateDOCX(translatedText);

    const pdfPath = `${document.user_id}/${documentId}_${targetLanguage}.pdf`;
    const docxPath = `${document.user_id}/${documentId}_${targetLanguage}.docx`;

    const { error: pdfUploadError } = await supabase.storage
      .from('translations')
      .upload(pdfPath, pdfBuffer2, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (pdfUploadError) throw pdfUploadError;

    const { error: docxUploadError } = await supabase.storage
      .from('translations')
      .upload(docxPath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (docxUploadError) throw docxUploadError;

    const { error: updateError } = await supabase
      .from('translations')
      .update({
        translated_pdf_path: pdfPath,
        translated_word_path: docxPath,
        status: 'completed',
      })
      .eq('document_id', documentId)
      .eq('target_language', targetLanguage);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: 'Translation completed' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
