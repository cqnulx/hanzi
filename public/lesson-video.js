import { getLanguage, translateText } from './i18n.js';
import { languageInfo } from './languages.js';

const WIDTH = 1280;
const HEIGHT = 720;
const SCENE_SECONDS = 3.5;
const FONT = '"HanziStudyText", "SimSun", serif';
const LATIN_FONT = '"HanziStudyText", "Microsoft YaHei", sans-serif';

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function fittedText(ctx, text, maxWidth, initialSize, family, minSize = 24) {
  let size = initialSize;
  do {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size -= 2;
  } while (size > minSize);
  return size;
}

function wrapText(ctx, text, maxWidth, language) {
  const lines = [];
  let line = '';
  const value=String(text||'');
  const segments=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(language,{granularity:'word'}).segment(value)].map(part=>part.segment):value.match(/\s+|\S+/gu)||[];
  for (const segment of segments) {
    const units=ctx.measureText(segment).width>maxWidth?[...segment]:[segment];
    for(const unit of units){
      const candidate=line+unit;
      if(ctx.measureText(candidate).width>maxWidth&&line.trim()){lines.push(line.trim());line=unit.trimStart();}
      else line=candidate;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function drawScene(ctx, lesson, frames, elapsed, totalSeconds, language) {
  const t=value=>translateText(value,language);
  const index = Math.min(Math.floor(elapsed / SCENE_SECONDS), frames.length - 1);
  const frame = frames[index];
  const withinScene = elapsed - index * SCENE_SECONDS;
  const entrance = Math.min(withinScene / 0.36, 1);
  const eased = 1 - (1 - entrance) ** 3;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5f3ec';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#e5ebe2';
  ctx.beginPath(); ctx.arc(1165, 120, 230, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#efe0cf';
  ctx.beginPath(); ctx.arc(104, 718, 170, 0, Math.PI * 2); ctx.fill();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000000';
  ctx.font = `bold 33px ${LATIN_FONT}`;
  ctx.fillText('Hanzi', 66, 65);
  ctx.font = `21px ${LATIN_FONT}`;
  ctx.fillStyle = '#000000';
  fittedText(ctx,t('A little every day.'),420,21,LATIN_FONT,17);
  ctx.fillText(t('A little every day.'), 160, 64);
  ctx.textAlign = 'right';
  fittedText(ctx,t('CAPTIONED PHRASE LESSON'),560,21,LATIN_FONT,17);
  ctx.fillText(t('CAPTIONED PHRASE LESSON'), WIDTH - 66, 64);
  ctx.save();
  ctx.translate(0, 16 * (1 - eased));
  ctx.globalAlpha = eased;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 66, 112, WIDTH - 132, 476, 30); ctx.fill();
  ctx.strokeStyle = '#dbe2d7'; ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000'; ctx.font = `21px ${LATIN_FONT}`;
  ctx.fillText(`${lesson.category.toUpperCase()}  /  ${lesson.level}`, WIDTH / 2, 170);
  ctx.fillStyle = '#000000';
  fittedText(ctx, frame.hanzi, WIDTH - 216, 79, FONT, 41);
  ctx.fillText(frame.hanzi, WIDTH / 2, 292);
  ctx.fillStyle = '#000000';
  fittedText(ctx, frame.pinyin, WIDTH - 216, 35, LATIN_FONT, 26);
  ctx.fillText(frame.pinyin, WIDTH / 2, 350);
  ctx.fillStyle = '#000000'; ctx.font = `33px ${LATIN_FONT}`;
  wrapText(ctx, frame.translation || frame.english, WIDTH - 240, languageInfo(language).locale).slice(0, 2).forEach((line, lineIndex) => ctx.fillText(line, WIDTH / 2, 416 + lineIndex * 38));
  ctx.fillStyle = '#000000';
  fittedText(ctx, frame.note, WIDTH - 240, 26, LATIN_FONT, 21);
  ctx.fillText(frame.note, WIDTH / 2, 530);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = '#000000'; ctx.font = `25px ${LATIN_FONT}`;
  fittedText(ctx,lesson.title,510,25,LATIN_FONT,17);
  ctx.fillText(lesson.title, 66, 637);
  ctx.textAlign = 'right'; ctx.fillStyle = '#000000'; ctx.font = `21px ${LATIN_FONT}`;
  const audioLabel=`${index + 1} / ${frames.length}   •   ${t('Listen to phrase audio below')}`;
  fittedText(ctx,audioLabel,620,21,LATIN_FONT,17);
  ctx.fillText(audioLabel, WIDTH - 66, 637);
  ctx.fillStyle = '#dce3d8'; roundedRect(ctx, 66, 670, WIDTH - 132, 6, 3); ctx.fill();
  ctx.fillStyle = '#3d7861'; roundedRect(ctx, 66, 670, Math.max(6, (WIDTH - 132) * Math.min(elapsed / totalSeconds, 1)), 6, 3); ctx.fill();
}

export async function createLessonVideo(lesson, { onProgress } = {}) {
  const language=getLanguage();
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) throw new Error('Animated video creation is not supported in this browser. You can still use the transcript and phrase audio below. Try Chrome or Edge for the video.');
  const frames = (lesson.videoFrames || lesson.phrases || []).slice(0, 6).map((frame) => ({ note: translateText('Practise this phrase, then make it your own.',language), ...frame }));
  if (!frames.length) throw new Error('This lesson has no video scenes yet.');
  await document.fonts?.ready;
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Your browser could not create the lesson video canvas.');
  const duration = frames.length * SCENE_SECONDS;
  drawScene(ctx, lesson, frames, 0, duration, language);
  const stream = canvas.captureStream(24);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) { stream.getTracks().forEach((track) => track.stop()); throw new Error('Your browser has no supported lesson video encoder. Use the transcript and phrase audio instead.'); }
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1800000 });
  const chunks = [];
  let animation, timer, startTime;
  let finished = false;
  const blob = await new Promise((resolve, reject) => {
    const cleanup = () => { cancelAnimationFrame(animation); clearTimeout(timer); stream.getTracks().forEach((track) => track.stop()); };
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { finished = true; cleanup(); reject(new Error('The browser video encoder could not finish. Use the transcript and phrase audio instead.')); };
    recorder.onstop = () => {
      cleanup();
      const videoBlob = new Blob(chunks, { type: recorder.mimeType || mimeType });
      if (!videoBlob.size) reject(new Error('The browser returned an empty lesson video. Please try again.'));
      else resolve(videoBlob);
    };
    const tick = (now) => {
      if (finished) return;
      startTime ??= now;
      const elapsed = Math.min((now - startTime) / 1000, duration);
      drawScene(ctx, lesson, frames, elapsed, duration, language);
      onProgress?.(Math.min(elapsed / duration, 1));
      if (elapsed >= duration) { finished = true; recorder.stop(); }
      else animation = requestAnimationFrame(tick);
    };
    recorder.start(200);
    animation = requestAnimationFrame(tick);
    timer = setTimeout(() => { if (finished) return; finished = true; if (recorder.state !== 'inactive') recorder.stop(); }, (duration + 10) * 1000);
  });
  const url = URL.createObjectURL(blob);
  let disposed = false;
  return { url, duration, mimeType: blob.type, dispose() { if (!disposed) URL.revokeObjectURL(url); disposed = true; } };
}
