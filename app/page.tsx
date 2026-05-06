import Link from 'next/link';
import {
  Activity, Scan, Brain, ShieldCheck, Zap, FileImage,
  ArrowRight, Check, Database, Microscope
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'YOLOv8 AI Engine',
    desc: 'State-of-the-art object detection model trained on the LIDC-IDRI dataset for precise nodule localisation.',
    color: 'var(--accent-bright)',
  },
  {
    icon: FileImage,
    title: 'DICOM Native Support',
    desc: 'Upload raw DICOM files (.dcm) directly with automatic HU windowing (WC=−600, WW=1500) for optimal lung visualisation.',
    color: 'var(--benign)',
  },
  {
    icon: Zap,
    title: 'Real-time Inference',
    desc: 'ONNX Runtime on the server side with model singleton caching ensures blazing-fast detection even on CPU.',
    color: 'var(--equivocal)',
  },
  {
    icon: ShieldCheck,
    title: '3-Class Classification',
    desc: 'Every detected nodule is classified as Benign, Equivocal, or Malignant with confidence scores for transparent reporting.',
    color: 'var(--malignant)',
  },
  {
    icon: Database,
    title: 'Batch Processing',
    desc: 'Analyse multiple scans simultaneously. Progress tracking and per-scan status so you never lose sight of the queue.',
    color: '#a78bfa',
  },
  {
    icon: Microscope,
    title: 'Annotated Results',
    desc: 'Bounding boxes are drawn directly onto the CT image with colour-coded labels, ready for download or inspection.',
    color: '#38bdf8',
  },
];

const classes = [
  { label: 'Benign', color: 'var(--benign)', bg: 'var(--benign-bg)', border: 'var(--benign-border)', desc: 'Non-cancerous nodules. Typically calcified or with smooth margins.' },
  { label: 'Equivocal', color: 'var(--equivocal)', bg: 'var(--equivocal-bg)', border: 'var(--equivocal-border)', desc: 'Indeterminate nodules requiring follow-up or additional imaging.' },
  { label: 'Malignant', color: 'var(--malignant)', bg: 'var(--malignant-bg)', border: 'var(--malignant-border)', desc: 'Suspicious nodules with features consistent with lung cancer.' },
];

const steps = [
  { num: '01', title: 'Upload', desc: 'Drag & drop your CT scan (DICOM, PNG, JPG or BMP).' },
  { num: '02', title: 'Detect', desc: 'Hit "Run Detection" and the model infers in seconds.' },
  { num: '03', title: 'Review', desc: 'Inspect annotated results with bounding boxes and confidence scores.' },
];

export default function HomePage() {
  return (
    <div className="home-page">

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">

          <h1 className="hero-title">
            AI-Powered<br />
            <span className="hero-accent">Lung Nodule</span><br />
            Detection
          </h1>

          <p className="hero-desc">
            ALUNA leverages state-of-the-art deep learning to detect and classify lung nodules
            from CT scans with high accuracy supporting DICOM, PNG, JPG and BMP formats.
          </p>

          <div className="hero-actions">
            <Link href="/scan" className="btn-primary hero-cta no-underline" id="hero-scan-btn">
              <Scan size={18} /> Start Scanning
              <ArrowRight size={16} />
            </Link>
            <Link href="/about" className="btn-secondary no-underline" id="hero-about-btn">
              Download app
            </Link>
          </div>

          <div className="hero-stats">
            {[
              { value: '3', label: 'Detection Classes' },
              { value: 'LIDC', label: 'Training Dataset' },
              { value: 'DCM', label: 'DICOM Support' },
            ].map(({ value, label }) => (
              <div key={label} className="hero-stat">
                <div className="hero-stat-value">{value}</div>
                <div className="hero-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────── */}
      <section className="section">
        <div className="section-inner">
          <div className="section-tag">Features</div>
          <h2 className="section-title">Everything you need for<br />nodule analysis</h2>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="feature-card">
                <div className="feature-icon" style={{ color }}>
                  <Icon size={26} />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────── */}
      <section className="section section-alt">
        <div className="section-inner">
          <div className="section-tag">Workflow</div>
          <h2 className="section-title">Three steps to detection</h2>
          <div className="steps-row">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="step-card">
                <div className="step-num">{num}</div>
                <h3 className="step-title">{title}</h3>
                <p className="step-desc">{desc}</p>
                {i < steps.length - 1 && <div className="step-arrow" aria-hidden="true"><ArrowRight size={20} /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Classes ──────────────────────────────────────────── */}
      <section className="section">
        <div className="section-inner">
          <div className="section-tag">Classification</div>
          <h2 className="section-title">Detection classes explained</h2>
          <div className="classes-grid">
            {classes.map(({ label, color, bg, border, desc }) => (
              <div key={label} className="class-card" style={{ background: bg, borderColor: border }}>
                <div className="class-dot" style={{ background: color }} />
                <h3 className="class-label" style={{ color }}>{label}</h3>
                <p className="class-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────── */}
      <section className="cta-section">
        <div className="cta-inner">
          <Activity size={40} style={{ color: 'var(--accent-bright)', marginBottom: '1rem' }} />
          <h2 className="cta-title">Ready to analyse your scans?</h2>
          <p className="cta-desc">Supports DICOM and standard formats.</p>
          <Link href="/scan" className="btn-primary no-underline" id="cta-scan-btn" style={{ fontSize: '1rem', padding: '14px 36px' }}>
            <Scan size={18} /> Launch Scanner
          </Link>
        </div>
      </section>
    </div>
  );
}
