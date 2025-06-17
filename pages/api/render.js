export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, outputType } = req.body;
  const replicateApiToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateApiToken) {
    return res.status(500).json({ error: 'Missing Replicate API token' });
  }

  try {
    // 1. Generate Image with Stable Diffusion XL
    const imageResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc", // Valid SDXL version
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
        version: "8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05", // Valid Riffusion version
        input: {
          prompt_a: prompt,
          denoising: 0.75
        }
      })
    });

    const audioData = await audioResponse.json();
    const audioUrl = await waitForPrediction(audioData, replicateApiToken);

    res.status(200).json({
      image: imageUrl,
      audio: audioUrl,
      type: outputType
    });

  } catch (err) {
    console.error("Generation error:", err);
    res.status(500).json({ error: 'Error generating media' });
  }
}

// Wait for prediction to complete and return output URL
async function waitForPrediction(data, token) {
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
