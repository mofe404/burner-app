export async function applyPitchShift(blob: Blob, rate: number = 0.7): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  // @ts-ignore - Vendor prefix support
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    Math.floor(audioBuffer.length / rate), // Adjust length to match the new duration
    audioBuffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = rate; 
  
  // Add a subtle low-pass for deeper voices to remove sharp sibilance
  if (rate < 0.8) {
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500; 
    source.connect(filter);
    filter.connect(offlineContext.destination);
  } else {
    source.connect(offlineContext.destination);
  }
  
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  return bufferToWavBlob(renderedBuffer);
}

function bufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); 
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" chunk
  setUint32(length - offset - 4); 

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sampleData = Math.max(-1, Math.min(1, channels[i][pos]));
      sampleData = sampleData < 0 ? sampleData * 0x8000 : sampleData * 0x7FFF;
      view.setInt16(offset, sampleData, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([view], { type: "audio/wav" });

  function setUint16(data: number) { view.setUint16(offset, data, true); offset += 2; }
  function setUint32(data: number) { view.setUint32(offset, data, true); offset += 4; }
}
