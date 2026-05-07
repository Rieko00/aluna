'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  UploadCloud, FileImage,
  Trash2, X, Search, Maximize2, Scan, AlertCircle, LayoutGrid, FileDown
} from 'lucide-react';
import type { Detection, FileResult } from '@/lib/types';
import { exportResultsToPdf } from '@/lib/pdf-export';

type Mode = 'single' | 'multi';

// ─── Constants ────────────────────────────────────────────────
const CLASS_COLORS: Record<string, string> = {
  benign: '#22c55e',
  equivocal: '#f59e0b',
  malignant: '#ef4444',
};

const ACCEPT_TYPES = '.jpg,.jpeg,.png,.bmp,.dcm,.dicom,*/*';

// ─── Draw bounding boxes onto canvas ─────────────────────────
function drawDetections(
  img: HTMLImageElement,
  detections: Detection[],
  origWidth: number,
  origHeight: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = origWidth;
  canvas.height = origHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, origWidth, origHeight);

  detections.forEach((det) => {
    const color = CLASS_COLORS[det.class] ?? '#ffffff';
    const x = det.x1, y = det.y1;
    const w = det.x2 - det.x1, h = det.y2 - det.y1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    ctx.shadowBlur = 0;
    const label = `${det.class} ${(det.confidence * 100).toFixed(1)}%`;
    ctx.font = 'bold 13px Inter, sans-serif';
    const tw = ctx.measureText(label).width;
    const lh = 20;
    const lx = x;
    const ly = y > lh + 4 ? y - lh - 4 : y + h + 2;
    ctx.fillStyle = color + 'dd';
    ctx.beginPath();
    ctx.roundRect(lx, ly, tw + 10, lh + 4, 4);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText(label, lx + 5, ly + lh - 2);
  });

  return canvas.toDataURL('image/jpeg', 0.92);
}

async function loadAndAnnotate(
  imageUrl: string,
  detections: Detection[],
  origWidth: number,
  origHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(drawDetections(img, detections, origWidth, origHeight));
    img.onerror = reject;
    img.src = imageUrl;
  });
}

let idCounter = 0;
function uid() { return `f-${Date.now()}-${idCounter++}`; }

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Result Card ──────────────────────────────────────────────
function ResultCard({
  result,
  onExpand,
}: {
  result: FileResult;
  onExpand: (url: string, name: string) => void;
}) {
  const name = result.file.name.toLowerCase();
  const isDcm = name.endsWith('.dcm') || name.endsWith('.dicom') || !name.includes('.');
  const displayUrl = result.annotatedUrl ?? result.imageUrl;

  return (
    <div className="result-card">
      <div className="result-card-img">
        {displayUrl ? (
          <>
            <img src={displayUrl} alt={result.file.name} />
            <button
              className="img-expand-btn"
              onClick={() => onExpand(displayUrl, result.file.name)}
              title="Expand"
            >
              <Maximize2 size={12} /> Expand
            </button>
          </>
        ) : result.status === 'processing' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
            <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : result.status === 'error' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: 'var(--malignant)', flexDirection: 'column', gap: 8, padding: 16 }}>
            <AlertCircle size={32} />
            <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>{result.error}</span>
          </div>
        ) : null}
      </div>
      <div className="result-card-body">
        <div className="result-filename">
          {isDcm && <span style={{ color: 'var(--accent-bright)', marginRight: 4 }}>DICOM·</span>}
          {result.file.name}
        </div>
        {result.status === 'done' && result.detections !== undefined && (
          <div className="detection-list">
            {result.detections.length === 0 ? (
              <div className="no-detection">No nodules detected</div>
            ) : (
              result.detections.map((det, i) => (
                <div key={i} className={`detection-item ${det.class}`}>
                  <div className="detection-dot" />
                  <span className="detection-label">{det.class}</span>
                  <span className="detection-conf">{(det.confidence * 100).toFixed(1)}%</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Scan Page ───────────────────────────────────────────
export default function ScanPage() {
  const [mode, setMode] = useState<Mode>('single');
  const [files, setFiles] = useState<FileResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [confidence, setConfidence] = useState(0.5);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modalImg, setModalImg] = useState<{ url: string; name: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPdf = async () => {
    const done = files.filter((f) => f.status === 'done');
    if (!done.length) return;
    setIsExporting(true);
    try {
      await exportResultsToPdf(done);
    } finally {
      setIsExporting(false);
    }
  };

  const doneResults = files.filter((f) => f.status === 'done' || f.status === 'error');
  const allDetections = doneResults.flatMap((f) => f.detections ?? []);
  const stats = {
    total: allDetections.length,
    benign: allDetections.filter((d) => d.class === 'benign').length,
    equivocal: allDetections.filter((d) => d.class === 'equivocal').length,
    malignant: allDetections.filter((d) => d.class === 'malignant').length,
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setFiles([]);
    setProgress(0);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setProgress(0);
  };

  const addFiles = useCallback(async (incoming: File[]) => {
    const valid = incoming.filter((f) => {
      const n = f.name.toLowerCase();
      return (
        n.endsWith('.jpg') || n.endsWith('.jpeg') ||
        n.endsWith('.png') || n.endsWith('.bmp') ||
        n.endsWith('.dcm') || n.endsWith('.dicom') ||
        !n.includes('.')
      );
    });

    if (valid.length === 0) return;

    const processedFiles = await Promise.all(valid.map(async (f) => {
      const isBmp = f.name.toLowerCase().endsWith('.bmp') || f.type === 'image/bmp';
      if (!isBmp) return f;
      return new Promise<File>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(f);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob ? new File([blob], f.name, { type: 'image/png' }) : f);
          }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(f); };
        img.src = url;
      });
    }));

    const newItems: FileResult[] = processedFiles.map((f) => ({
      id: uid(),
      file: f,
      status: 'pending',
      imageUrl: URL.createObjectURL(f),
    }));

    setFiles((prev) => {
      if (mode === 'single') return [newItems[newItems.length - 1]];
      return [...prev, ...newItems];
    });
  }, [mode]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const runDetection = async () => {
    const pending = files.filter((f) => f.status === 'pending' || f.status === 'error');
    if (!pending.length) return;
    setIsRunning(true);
    setProgress(0);

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: 'processing' } : f));

      try {
        const result = await new Promise<{
          detections: Detection[];
          origWidth: number;
          origHeight: number;
          dicomBase64?: string;
        }>((resolve, reject) => {
          const worker = new Worker(
            new URL('./detector.worker.ts', import.meta.url),
            { type: 'module' },
          );
          worker.onmessage = (e) => {
            worker.terminate();
            if (e.data.error) reject(new Error(e.data.error));
            else resolve(e.data);
          };
          worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message));
          };
          worker.postMessage({ file: item.file, conf: confidence });
        });

        const { detections, origWidth, origHeight, dicomBase64 } = result;

        let annotatedUrl: string | undefined;
        const sourceUrl = dicomBase64 || item.imageUrl;

        if (sourceUrl && detections.length > 0) {
          try {
            annotatedUrl = await loadAndAnnotate(sourceUrl, detections, origWidth, origHeight);
          } catch {
            annotatedUrl = sourceUrl;
          }
        } else {
          annotatedUrl = sourceUrl;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, status: 'done', detections, origWidth, origHeight, annotatedUrl }
              : f,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: 'error', error: msg } : f));
      }

      setProgress(Math.round(((i + 1) / pending.length) * 100));
    }

    setIsRunning(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalImg(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const hasPending = files.some((f) => f.status === 'pending' || f.status === 'error');
  const hasResults = doneResults.length > 0;

  return (
    <>
      <main className="main-content">
        {/* Page title */}
        <div className="page-header">
          <h1 className="page-title">CT Scan Detection</h1>
          <p className="page-subtitle">Upload CT scan images to detect lung nodules using AI model.</p>
        </div>

        {/* Mode Tabs */}
        <div className="mode-tabs" role="tablist" aria-label="Detection mode">
          <button
            id="tab-single"
            role="tab"
            aria-selected={mode === 'single'}
            className={`mode-tab ${mode === 'single' ? 'active' : ''}`}
            onClick={() => handleModeChange('single')}
          >
            <FileImage size={16} /> Single File
          </button>
          <button
            id="tab-multi"
            role="tab"
            aria-selected={mode === 'multi'}
            className={`mode-tab ${mode === 'multi' ? 'active' : ''}`}
            onClick={() => handleModeChange('multi')}
          >
            <LayoutGrid size={16} /> Multi File
          </button>
        </div>

        {/* Drop Zone */}
        <div
          id="drop-zone"
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleFileDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload CT scan images"
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <div className="drop-icon"><UploadCloud size={32} /></div>
          <div className="drop-title">
            {dragOver ? 'Drop here!' : mode === 'single' ? 'Drop a CT scan or click to browse' : 'Drop CT scans or click to browse'}
          </div>
          <div className="drop-desc">
            {mode === 'single' ? 'Upload one image at a time' : 'Select multiple files for batch processing'}
          </div>
          <div className="drop-formats">
            {['.dcm', '.dicom', '.jpg', '.jpeg', '.png', '.bmp'].map((f) => (
              <span key={f} className="format-badge">{f}</span>
            ))}
          </div>
          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            accept={ACCEPT_TYPES}
            multiple={mode === 'multi'}
            onChange={handleFileInput}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map((item) => (
              <div key={item.id} className="file-item">
                <div className="file-icon">
                  {item.file.name.toLowerCase().endsWith('.dcm') || item.file.name.toLowerCase().endsWith('.dicom') || !item.file.name.includes('.')
                    ? 'DCM' : <FileImage size={16} />}
                </div>
                <div className="file-info">
                  <div className="file-name">{item.file.name}</div>
                  <div className="file-size">{fmtSize(item.file.size)}</div>
                </div>
                <span className={`file-status ${item.status}`}>
                  {item.status === 'processing' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                      Processing
                    </span>
                  ) : item.status}
                </span>
                {item.status !== 'processing' && (
                  <button
                    className="file-remove"
                    onClick={() => removeFile(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action bar */}
        {files.length > 0 && (
          <div className="action-bar">
            <button
              id="btn-run"
              className="btn-primary"
              onClick={runDetection}
              disabled={isRunning || !hasPending}
              aria-label="Run detection"
            >
              {isRunning ? (
                <><div className="spinner" /> Detecting…</>
              ) : (
                <><Scan size={16} /> Run Detection</>
              )}
            </button>

            <button
              id="btn-clear"
              className="btn-secondary"
              onClick={clearAll}
              disabled={isRunning}
              aria-label="Clear all files"
            >
              <Trash2 size={16} /> Clear All
            </button>

            <div className="confidence-control">
              <label htmlFor="conf-slider" style={{ whiteSpace: 'nowrap' }}>Confidence:</label>
              <input
                id="conf-slider"
                type="range"
                className="conf-slider"
                min={0.05}
                max={0.95}
                step={0.05}
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                aria-label="Confidence threshold"
              />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--accent-bright)', minWidth: 38 }}>
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {isRunning && files.length > 1 && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span className="progress-text">Batch processing…</span>
              <span className="progress-pct">{progress}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="results-section">
            <div className="results-header">
              <h2 className="results-title">
                <Search size={18} /> Detection Results
                <span className="results-count">{doneResults.length} scan{doneResults.length !== 1 ? 's' : ''}</span>
              </h2>
              <button
                id="btn-export-pdf"
                className="btn-export-pdf"
                onClick={handleExportPdf}
                disabled={isExporting || isRunning}
                title="Export hasil deteksi ke PDF"
              >
                {isExporting ? (
                  <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating PDF…</>
                ) : (
                  <><FileDown size={16} /> Export PDF</>
                )}
              </button>
            </div>

            {allDetections.length > 0 && (
              <div className="summary-stats">
                <div className="stat-card stat-total">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Total Nodules</div>
                </div>
                <div className="stat-card stat-benign">
                  <div className="stat-value">{stats.benign}</div>
                  <div className="stat-label">Benign</div>
                </div>
                <div className="stat-card stat-equivocal">
                  <div className="stat-value">{stats.equivocal}</div>
                  <div className="stat-label">Equivocal</div>
                </div>
                <div className="stat-card stat-malignant">
                  <div className="stat-value">{stats.malignant}</div>
                  <div className="stat-label">Malignant</div>
                </div>
              </div>
            )}

            <div className="results-grid">
              {doneResults.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  onExpand={(url, name) => setModalImg({ url, name })}
                />
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && (
          <div className="empty-state">
            <Search size={48} strokeWidth={1} style={{ marginBottom: '1rem', color: 'var(--border-bright)' }} />
            <div className="empty-title">No scans loaded</div>
            <div className="empty-desc">Upload CT scan images above to begin nodule detection</div>
          </div>
        )}
      </main>

      {/* Modal */}
      {modalImg && (
        <div
          className="modal-overlay"
          onClick={() => setModalImg(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Expanded view of ${modalImg.name}`}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modalImg.name}</span>
              <button className="modal-close" onClick={() => setModalImg(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <img className="modal-img" src={modalImg.url} alt={modalImg.name} />
          </div>
        </div>
      )}
    </>
  );
}
