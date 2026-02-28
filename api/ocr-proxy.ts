
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64 } = req.body;
  const apiKey = process.env.OCR_SPACE_KEY || "K88916317488957"; // Fallback to public if not set, but better to set it

  if (!base64) {
    return res.status(400).json({ error: 'Missing base64 content' });
  }

  try {
    const formData = new FormData();
    formData.append("base64Image", `data:application/pdf;base64,${base64}`);
    formData.append("apikey", apiKey);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("OCREngine", "2");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      return res.status(500).json({ error: data.ErrorMessage });
    }

    const text = data.ParsedResults?.map((p: any) => p.ParsedText).join('\n') || "";
    return res.status(200).json({ text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
