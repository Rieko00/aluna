import { NextRequest } from "next/server";
import * as ort from "onnxruntime-node";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import dicomParser from "dicom-parser";

// ─── Constants ────────────────────────────────────────────────
const MODEL_PATH = path.join(process.cwd(), "models", "best.onnx");
const INPUT_SIZE = 640;
const CLASS_NAMES = ["benign", "equivocal", "malignant"];

// DICOM window settings: WC = -600, WW = 1500
const DICOM_WC = -600;
const DICOM_WW = 1500;
const DICOM_WIN_MIN = DICOM_WC - DICOM_WW / 2; // -1350
const DICOM_WIN_MAX = DICOM_WC + DICOM_WW / 2; //  150

// ─── Model Singleton ──────────────────────────────────────────
let sessionCache: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionCache) {
    sessionCache = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"],
    });
  }
  return sessionCache;
}

// ─── DICOM → Uint8 pixel normalization (windowing) ───────────
function applyDicomWindowing(
  rawPixels: Int16Array | Uint16Array | Int8Array | Uint8Array,
  rows: number,
  cols: number,
  rescaleSlope: number,
  rescaleIntercept: number
): Buffer {
  const rgb = Buffer.alloc(rows * cols * 3);

  for (let i = 0; i < rows * cols; i++) {
    // Apply rescale: HU = pixel * slope + intercept
    const hu = rawPixels[i] * rescaleSlope + rescaleIntercept;
    // Apply windowing
    const clamped = Math.max(DICOM_WIN_MIN, Math.min(DICOM_WIN_MAX, hu));
    const norm = ((clamped - DICOM_WIN_MIN) / DICOM_WW) * 255;
    const val = Math.round(Math.max(0, Math.min(255, norm)));
    rgb[i * 3] = val;
    rgb[i * 3 + 1] = val;
    rgb[i * 3 + 2] = val;
  }

  return rgb;
}

// ─── Preprocess Image → Float32 tensor ───────────────────────
async function preprocessImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ tensor: ort.Tensor; origWidth: number; origHeight: number; dicomBase64?: string }> {
  let sharpInstance: sharp.Sharp;
  let dicomBase64: string | undefined;

  if (mimeType === "application/dicom" || mimeType === "dcm") {
    // Parse DICOM
    const byteArray = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const rows: number = dataSet.uint16("x00280010") ?? 512;
    const cols: number = dataSet.uint16("x00280011") ?? 512;
    const bitsAllocated: number = dataSet.uint16("x00280100") ?? 16;
    const pixelRepresentation: number = dataSet.uint16("x00280103") ?? 0; // 0=unsigned, 1=signed
    const rescaleSlope: number = parseFloat(dataSet.string("x00281053") ?? "1") || 1;
    const rescaleIntercept: number = parseFloat(dataSet.string("x00281052") ?? "0") || 0;

    const pixelDataElement = dataSet.elements.x7fe00010;
    if (!pixelDataElement) throw new Error("No pixel data in DICOM");

    const pixelOffset = pixelDataElement.dataOffset;
    const pixelLength = pixelDataElement.length;

    let rawPixels: Int16Array | Uint16Array | Int8Array | Uint8Array;

    if (bitsAllocated === 16) {
      const raw = buffer.buffer.slice(
        buffer.byteOffset + pixelOffset,
        buffer.byteOffset + pixelOffset + pixelLength
      );
      rawPixels =
        pixelRepresentation === 1
          ? new Int16Array(raw)
          : new Uint16Array(raw);
    } else {
      const raw = buffer.buffer.slice(
        buffer.byteOffset + pixelOffset,
        buffer.byteOffset + pixelOffset + pixelLength
      );
      rawPixels =
        pixelRepresentation === 1
          ? new Int8Array(raw)
          : new Uint8Array(raw);
    }

    const rgbBuf = applyDicomWindowing(
      rawPixels,
      rows,
      cols,
      rescaleSlope,
      rescaleIntercept
    );

    sharpInstance = sharp(rgbBuf, { raw: { width: cols, height: rows, channels: 3 } });
    const jpegBuf = await sharpInstance.clone().jpeg().toBuffer();
    dicomBase64 = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`;
  } else {
    sharpInstance = sharp(buffer);
  }

  const { data, info } = await sharpInstance
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const origWidth = info.width;
  const origHeight = info.height;
  const channels = info.channels;

  // Float32 in CHW format, normalized [0,1]
  const tensorData = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  const totalPixels = INPUT_SIZE * INPUT_SIZE;

  for (let i = 0; i < totalPixels; i++) {
    tensorData[0 * totalPixels + i] = data[i * channels + 0] / 255.0; // R
    tensorData[1 * totalPixels + i] = data[i * channels + 1] / 255.0; // G
    tensorData[2 * totalPixels + i] = data[i * channels + 2] / 255.0; // B
  }

  const tensor = new ort.Tensor("float32", tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  return { tensor, origWidth, origHeight, dicomBase64 };
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
  const interW = Math.max(0, ix2 - ix1);
  const interH = Math.max(0, iy2 - iy1);
  const inter = interW * interH;
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter + 1e-6);
}

function nms(boxes: Box[], iouThreshold = 0.45): Box[] {
  boxes.sort((a, b) => b.score - a.score);
  const keep: Box[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < boxes.length; i++) {
    if (suppressed.has(i)) continue;
    keep.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (!suppressed.has(j) && iou(boxes[i], boxes[j]) > iouThreshold) {
        suppressed.add(j);
      }
    }
  }
  return keep;
}

// ─── Post-process YOLOv8 output ───────────────────────────────
// YOLOv8 output shape: [1, 4+num_classes, num_anchors]
function postprocess(
  output: ort.Tensor,
  confThreshold: number,
  origWidth: number,
  origHeight: number
): Detection[] {
  const data = output.data as Float32Array;
  const shape = output.dims; // [1, 7, 8400] for 3 classes
  const numAnchors = shape[2];
  const numClasses = shape[1] - 4;

  const boxes: Box[] = [];

  for (let i = 0; i < numAnchors; i++) {
    // cx, cy, w, h
    const cx = data[0 * numAnchors + i];
    const cy = data[1 * numAnchors + i];
    const w  = data[2 * numAnchors + i];
    const h  = data[3 * numAnchors + i];

    // Class scores
    let maxScore = -Infinity;
    let classId = 0;
    for (let c = 0; c < numClasses; c++) {
      const s = data[(4 + c) * numAnchors + i];
      if (s > maxScore) { maxScore = s; classId = c; }
    }

    if (maxScore < confThreshold) continue;

    // Scale to original dimensions
    const scaleX = origWidth / INPUT_SIZE;
    const scaleY = origHeight / INPUT_SIZE;
    const x1 = (cx - w / 2) * scaleX;
    const y1 = (cy - h / 2) * scaleY;
    const x2 = (cx + w / 2) * scaleX;
    const y2 = (cy + h / 2) * scaleY;

    boxes.push({ x1, y1, x2, y2, score: maxScore, classId });
  }

  const kept = nms(boxes);

  return kept.map((b) => ({
    x1: Math.round(b.x1),
    y1: Math.round(b.y1),
    x2: Math.round(b.x2),
    y2: Math.round(b.y2),
    confidence: parseFloat(b.score.toFixed(4)),
    class: CLASS_NAMES[b.classId] ?? "unknown",
    classId: b.classId,
  }));
}

export interface Detection {
  x1: number; y1: number; x2: number; y2: number;
  confidence: number;
  class: string;
  classId: number;
}

// ─── Route Handler ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    if (!fs.existsSync(MODEL_PATH)) {
      return Response.json(
        { error: "Model file not found at: " + MODEL_PATH },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const confThreshold = parseFloat((formData.get("conf") as string) ?? "0.25");

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine type
    const name = file.name.toLowerCase();
    let isDicom = name.endsWith(".dcm") || name.endsWith(".dicom") || file.type === "application/dicom";

    // Detect DICOM via magic number for extension-less files
    if (!isDicom && buffer.length >= 132) {
      if (buffer.toString("ascii", 128, 132) === "DICM") {
        isDicom = true;
      }
    }

    const mimeType = isDicom ? "dcm" : file.type;

    // Get original dimensions for non-DICOM images
    let origWidth = INPUT_SIZE;
    let origHeight = INPUT_SIZE;

    if (!isDicom) {
      const meta = await sharp(buffer).metadata();
      origWidth = meta.width ?? INPUT_SIZE;
      origHeight = meta.height ?? INPUT_SIZE;
    }

    // Preprocess
    const { tensor, origWidth: pw, origHeight: ph, dicomBase64 } = await preprocessImage(buffer, mimeType);
    if (!isDicom) { origWidth = pw; origHeight = ph; }

    // Run inference
    const session = await getSession();
    const inputName = session.inputNames[0];
    const feeds: Record<string, ort.Tensor> = { [inputName]: tensor };
    const results = await session.run(feeds);

    const outputName = session.outputNames[0];
    const outputTensor = results[outputName];

    // Post-process
    const detections = postprocess(outputTensor, confThreshold, origWidth, origHeight);

    return Response.json({ detections, origWidth, origHeight, dicomBase64 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[detect]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
