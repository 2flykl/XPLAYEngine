const imageInput = document.getElementById('imageInput');
const contextInput = document.getElementById('contextInput');
const previewImage = document.getElementById('previewImage');
const previewEmpty = document.getElementById('previewEmpty');
const statusEl = document.getElementById('status');
const jsonOutput = document.getElementById('jsonOutput');
const rawOutput = document.getElementById('rawOutput');
const summaryOutput = document.getElementById('summaryOutput');
const healthBtn = document.getElementById('healthBtn');
const analyzeBtn = document.getElementById('analyzeBtn');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#9f1239' : '#517086';
  statusEl.style.borderColor = isError ? '#f5c2cf' : '#d9efee';
  statusEl.style.background = isError ? '#fff1f4' : '#f5fbfb';
}

imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    previewImage.src = reader.result;
    previewImage.style.display = 'block';
    previewEmpty.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

healthBtn.addEventListener('click', async () => {
  try {
    setStatus('Checking OpenAI health...');
    const res = await fetch('/api/vision/health');
    const data = await res.json();
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    rawOutput.textContent = '';
    summaryOutput.textContent = data.configured
      ? `OpenAI is connected. Model: ${data.model}.` 
      : 'OpenAI is not configured yet.';
    setStatus(data.configured ? 'Health check passed.' : 'Health check says OpenAI is not configured.', !data.configured);
  } catch (error) {
    setStatus(error.message || 'Health check failed.', true);
  }
});

analyzeBtn.addEventListener('click', async () => {
  const file = imageInput.files?.[0];
  if (!file) {
    setStatus('Please upload an image first.', true);
    return;
  }
  try {
    setStatus('Sending image to OpenAI Vision...');
    const form = new FormData();
    form.append('image', file);
    form.append('context', contextInput.value || '');
    const res = await fetch('/api/vision/analyze', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      jsonOutput.textContent = JSON.stringify(data, null, 2);
      rawOutput.textContent = data.rawText || '';
      summaryOutput.textContent = data.error || 'OpenAI analysis failed.';
      setStatus(data.error || 'OpenAI analysis failed.', true);
      return;
    }

    jsonOutput.textContent = JSON.stringify(data.packet, null, 2);
    rawOutput.textContent = data.rawText || '';
    summaryOutput.textContent = data.packet.summary || data.packet.buildPrompt || 'Analysis complete.';
    setStatus(`Vision completed successfully with ${data.model}.`);
  } catch (error) {
    setStatus(error.message || 'Analyze failed.', true);
  }
});
