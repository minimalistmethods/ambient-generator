import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState('mp4');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAudioUrl('');
    setImageUrl('');

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, outputType: format })
      });
      const data = await res.json();
      setAudioUrl(data.audio);
      setImageUrl(data.image);
    } catch (err) {
      console.error('Error rendering content:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Fantasy Ambient Generator</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 border rounded"
          type="text"
          placeholder="Enter a fantasy scene..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
        <select
          className="w-full p-2 border rounded"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="mp4">Video (mp4)</option>
          <option value="mp3">Audio only (mp3)</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      {imageUrl && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Preview</h2>
          <img src={imageUrl} alt="Generated fantasy scene" className="rounded shadow mb-4" />
        </div>
      )}

      {audioUrl && (
        <div className="mt-4">
          <audio controls src={audioUrl} className="w-full" />
          <a href={audioUrl} download className="block mt-2 text-blue-700 underline">
            Download {format === 'mp3' ? 'MP3' : 'Audio'}
          </a>
        </div>
      )}
    </main>
  );
}
