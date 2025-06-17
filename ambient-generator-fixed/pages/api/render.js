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
    // 1. Generate Image with Stable Diffusion (SDXL)
    const imageResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateApiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "a9758cbfdb93825c0651a7e9c2b66067db3d6b3d6e43065c1d5a2987a0498e5c",
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
        version: "f5ac9c15b9e25d4c576e89f3f54e053b8e8b9ad622c9f803e4d89186df209f1f",
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
    console.error(err);
    res.status(500).json({ error: 'Error generating media' });
  }
}

// Helper to wait for completion
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
