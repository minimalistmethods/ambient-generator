// pages/api/render.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { prompt, format } = req.body;
  const replicateApiToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiToken) {
    return res.status(500).json({ error: 'Missing Replicate API token' });
  }

  try {
    // 1. Generate Image with SDXL
    const imageResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "a9758cbfdb93825c0651a7e9c2b66067db3d6b3d6e43065c1d5a2987a0498e5c", // SDXL
        input: {
          prompt: prompt,
          width: 1024,
          height: 768
        }
      })
    });

    const imageData = await imageResponse.json();
    const imageUrl = await waitForPrediction(imageData, replicateApiToken);

    // 2. Generate Audio with Riffusion
    const audioResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "f5ac9c15b9e25d4c576e89f3f54e053b8e8b9ad622c9f803e4d89186df209f1f", // Riffusion
        input: {
          prompt_a: prompt,
          denoising: 0.75
        }
      })
    });

    const audioData = await audioResponse.json();
    const audioUrl = await waitForPrediction(audioData, replicateApiToken);

    // 3. Return audio + image, or later, video
    res.status(200).json({
      format,
      image: imageUrl,
      audio: audioUrl,
      url: format === 'mp3' ? audioUrl : 'VIDEO_NOT_IMPLEMENTED_YET' // update later
    });

  } catch (err) {
    console.error('Error generating media:', err);
    res.status(500).json({ error: 'Error generating media' });
  }
}

// Polling function for prediction results
async function waitForPrediction(data: any, token: string): Promise<string> {
  const predictionUrl = data?.urls?.get;
  let status = data?.status;

  while (status !== "succeeded" && status !== "failed") {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(predictionUrl, {
      headers: { "Authorization": `Token ${token}` }
    });
    const json = await res.json();
    status = json.status;
    if (status === "succeeded") return json.output[0];
  }

  throw new Error("Prediction failed");
}
