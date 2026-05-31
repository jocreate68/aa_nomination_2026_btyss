// Vercel serverless function — proxies requests to Gemini API
// Handles two modes:
// 1. POST /api/generate        — standard generate (files <4MB total)
// 2. POST /api/generate?upload — upload a single file to Gemini File API, returns fileUri

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  // ── MODE 1: File upload to Gemini File API ──────────────────────────────
  // Called with ?upload=1, body: { mimeType, data (base64), displayName }
  if (req.query.upload) {
    try {
      const { mimeType, data, displayName } = req.body;
      const fileBytes = Buffer.from(data, 'base64');
      const numBytes = fileBytes.length;

      // Step 1: initiate resumable upload
      const initRes = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=resumable&key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': numBytes,
            'X-Goog-Upload-Header-Content-Type': mimeType,
          },
          body: JSON.stringify({ file: { display_name: displayName } }),
        }
      );

      const uploadUrl = initRes.headers.get('x-goog-upload-url');
      if (!uploadUrl) {
        return res.status(500).json({ error: 'Failed to get upload URL from Gemini' });
      }

      // Step 2: upload the actual bytes
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': numBytes,
          'X-Goog-Upload-Offset': 0,
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: fileBytes,
      });

      const fileInfo = await uploadRes.json();
      return res.status(200).json({ fileUri: fileInfo?.file?.uri, name: fileInfo?.file?.name });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── MODE 2: Standard generate (stream) ─────────────────────────────────
  const GEMINI_MODEL = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    res.status(geminiRes.status);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = geminiRes.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '20mb' },
    responseLimit: false,
  },
};
