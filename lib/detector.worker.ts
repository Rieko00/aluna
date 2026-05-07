/**
 * detector.worker.ts
 * Runs ONNX inference in a Web Worker to keep the UI thread responsive.
 * Receives: { file: File, conf: number }
 * Sends:    { detections, origWidth, origHeight, dicomBase64? } | { error: string }
 */

import * as ort from 'onnxruntime-web';
import dicomParser from 'dicom-parser';

// ─── WASM path – served from /public ──────────────────────────
ort.env.wasm.wasmPaths = '/';

const MODEL_URL = '/models/best.onnx';
const INPUT_SIZE = 640;
const CLASS_NAMES = ['benign', 'equivocal', 'malignant'];

// DICOM window settings
const DICOM_WC = -600;
const DICOM_WW = 1500;
const DICOM_WIN_MIN = DICOM_WC - DICOM_WW / 2; // -1350
const DICOM_WIN_MAX = DICOM_WC + DICOM_WW / 2; //  150

let sessionCache: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionCache) {
    sessionCache = await ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ['wasm'],
    });
  }
  return sessionCache;
}

// ─── DICOM windowing ──────────────────────────────────────────
function applyDicomWindowing(
  rawPixels: Int16Array | Uint16Array | Int8Array | Uint8Array,
  rows: number,
  cols: number,
  rescaleSlope: number,
  rescaleIntercept: number,
): Uint8ClampedArray<ArrayBuffer> {
  const buf = new ArrayBuffer(rows * cols * 4);
  const rgba = new Uint8ClampedArray(buf) as Uint8ClampedArray<ArrayBuffer>;
  for (let i = 0; i < rows * cols; i++) {
    const hu = rawPixels[i] * rescaleSlope + rescaleIntercept;
    const clamped = Math.max(DICOM_WIN_MIN, Math.min(DICOM_WIN_MAX, hu));
    const val = Math.round(((clamped - DICOM_WIN_MIN) / DICOM_WW) * 255);
    const v = Math.max(0, Math.min(255, val));
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

// ─── Preprocess ───────────────────────────────────────────────
async function preprocessFile(file: File): Promise<{
  tensorData: Float32Array;
  origWidth: number;
  origHeight: number;
  dicomBase64?: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const name = file.name.toLowerCase();
  const isDicom =
    name.endsWith('.dcm') ||
    name.endsWith('.dicom') ||
    !name.includes('.') ||
    (bytes.length >= 132 && new TextDecoder().decode(bytes.slice(128, 132)) === 'DICM');

  let imageBitmap: ImageBitmap;
  let dicomBase64: string | undefined;

  if (isDicom) {
    const dataSet = dicomParser.parseDicom(bytes);
    const rows: number = dataSet.uint16('x00280010') ?? 512;
    const cols: number = dataSet.uint16('x00280011') ?? 512;
    const bitsAllocated: number = dataSet.uint16('x00280100') ?? 16;
    const pixelRepresentation: number = dataSet.uint16('x00280103') ?? 0;
    const rescaleSlope: number = parseFloat(dataSet.string('x00281053') ?? '1') || 1;
    const rescaleIntercept: number = parseFloat(dataSet.string('x00281052') ?? '0') || 0;

    const pixelDataElement = dataSet.elements.x7fe00010;
    if (!pixelDataElement) throw new Error('No pixel data in DICOM');

    const { dataOffset, length: pixelLength } = pixelDataElement;
    const rawBuffer = arrayBuffer.slice(dataOffset, dataOffset + pixelLength);

    let rawPixels: Int16Array | Uint16Array | Int8Array | Uint8Array;
    if (bitsAllocated === 16) {
      rawPixels = pixelRepresentation === 1 ? new Int16Array(rawBuffer) : new Uint16Array(rawBuffer);
    } else {
      rawPixels = pixelRepresentation === 1 ? new Int8Array(rawBuffer) : new Uint8Array(rawBuffer);
    }

    const rgba = applyDicomWindowing(rawPixels, rows, cols, rescaleSlope, rescaleIntercept);
    const imageData = new ImageData(rgba, cols, rows);
    imageBitmap = await createImageBitmap(imageData);

    // Build base64 preview via OffscreenCanvas
    const ofc = new OffscreenCanvas(cols, rows);
    const ctx = ofc.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    const blob = await ofc.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    const buf = await blob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    dicomBase64 = `data:image/jpeg;base64,${b64}`;
  } else {
    imageBitmap = await createImageBitmap(new Blob([arrayBuffer], { type: file.type }));
  }

  const origWidth = imageBitmap.width;
  const origHeight = imageBitmap.height;

  // Resize to INPUT_SIZE×INPUT_SIZE via OffscreenCanvas
  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  imageBitmap.close();

  const pixel = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const totalPixels = INPUT_SIZE * INPUT_SIZE;
  const tensorData = new Float32Array(3 * totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    tensorData[i] = pixel[i * 4] / 255.0;                 // R
    tensorData[totalPixels + i] = pixel[i * 4 + 1] / 255.0; // G
    tensorData[2 * totalPixels + i] = pixel[i * 4 + 2] / 255.0; // B
  }

  return { tensorData, origWidth, origHeight, dicomBase64 };
}

// ─── NMS ──────────────────────────────────────────────────────
interface Box {
  x1: number; y1: number; x2: number; y2: number;
  score: number; classId: number;
}

function iou(a: Box, b: Box): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  return inter / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter + 1e-6);
}

function nms(boxes: Box[], iouThreshold = 0.45): Box[] {
  boxes.sort((a, b) => b.score - a.score);
  const keep: Box[] = [];
  const suppressed = new Set<number>();
  for (let i = 0; i < boxes.length; i++) {
    if (suppressed.has(i)) continue;
    keep.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (!suppressed.has(j) && iou(boxes[i], boxes[j]) > iouThreshold) suppressed.add(j);
    }
  }
  return keep;
}

// ─── Post-process YOLOv8 output ───────────────────────────────
function postprocess(
  output: ort.Tensor,
  confThreshold: number,
  origWidth: number,
  origHeight: number,
) {
  const data = output.data as Float32Array;
  const numAnchors = output.dims[2];
  const numClasses = output.dims[1] - 4;
  const scaleX = origWidth / INPUT_SIZE;
  const scaleY = origHeight / INPUT_SIZE;

  const boxes: Box[] = [];
  for (let i = 0; i < numAnchors; i++) {
    const cx = data[0 * numAnchors + i];
    const cy = data[1 * numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];

    let maxScore = -Infinity;
    let classId = 0;
    for (let c = 0; c < numClasses; c++) {
      const s = data[(4 + c) * numAnchors + i];
      if (s > maxScore) { maxScore = s; classId = c; }
    }

    if (maxScore < confThreshold) continue;

    boxes.push({
      x1: (cx - w / 2) * scaleX,
      y1: (cy - h / 2) * scaleY,
      x2: (cx + w / 2) * scaleX,
      y2: (cy + h / 2) * scaleY,
      score: maxScore,
      classId,
    });
  }

  return nms(boxes).map((b) => ({
    x1: Math.round(b.x1),
    y1: Math.round(b.y1),
    x2: Math.round(b.x2),
    y2: Math.round(b.y2),
    confidence: parseFloat(b.score.toFixed(4)),
    class: CLASS_NAMES[b.classId] ?? 'unknown',
    classId: b.classId,
  }));
}

// ─── Message handler ──────────────────────────────────────────
self.addEventListener('message', async (event: MessageEvent<{ file: File; conf: number }>) => {
  const { file, conf } = event.data;
  try {
    const { tensorData, origWidth, origHeight, dicomBase64 } = await preprocessFile(file);

    const session = await getSession();
    const tensor = new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: tensor };
    const results = await session.run(feeds);

    const outputTensor = results[session.outputNames[0]];
    const detections = postprocess(outputTensor, conf, origWidth, origHeight);

    self.postMessage({ detections, origWidth, origHeight, dicomBase64 });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
});
