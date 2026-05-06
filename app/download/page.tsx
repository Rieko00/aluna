import { Download, Monitor, Smartphone, ShieldCheck, Zap } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="home-page">
      <section className="section" style={{ paddingTop: '5rem' }}>
        <div className="section-inner" style={{ maxWidth: 900 }}>
          <div className="section-tag" style={{ textAlign: 'center' }}>Downloads</div>
          <h1 className="section-title" style={{ textAlign: 'center' }}>Get ALUNA for your device</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '4rem', textAlign: 'center', maxWidth: 600, margin: '0 auto 4rem' }}>
            Experience native performance and offline inference capabilities with our dedicated desktop and mobile applications.
          </p>

          <div className="downloads-grid">
            {/* Desktop */}
            <div className="download-card">
              <div className="download-icon-wrap">
                <Monitor size={32} />
              </div>
              <h2 className="download-title">Desktop Apps</h2>
              <p className="download-desc">Full performance with local ONNX Runtime execution for Windows, macOS, and Linux.</p>

              <div className="download-links">
                <a href="https://github.com/Rieko00/aluna/releases/download/pre-release/Aluna.v1.0.0.msix" className="btn-primary download-btn">
                  <Download size={16} /> Windows (.exe)
                </a>
                <a href="#" style={{ opacity: 0.5, cursor: 'not-allowed' }} className="btn-secondary download-btn">
                  <Download size={16} /> macOS (.dmg)
                </a>
                <a href="#" style={{ opacity: 0.5, cursor: 'not-allowed' }} className="btn-secondary download-btn">
                  <Download size={16} /> Linux (.AppImage)
                </a>
              </div>
            </div>

            {/* Mobile */}
            <div className="download-card">
              <div className="download-icon-wrap">
                <Smartphone size={32} />
              </div>
              <h2 className="download-title">Mobile Apps</h2>
              <p className="download-desc">Scan and review results on the go. Optimized for mobile inference.</p>

              <div className="download-links">
                <a href="https://github.com/Rieko00/aluna/releases/download/pre-release/Aluna.v1.0.0.apk" className="btn-primary download-btn">
                  <Download size={16} /> Android (.apk)
                </a>
                <a href="#" className="btn-secondary download-btn" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <Download size={16} /> iOS (Coming Soon)
                </a>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '5rem', padding: '2rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={20} color="var(--benign)" /> Secure & Verified
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                All binaries are cryptographically signed. MD5 and SHA-256 checksums are available on our GitHub releases page.
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 250 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={20} color="var(--equivocal)" /> Auto-Updates
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Desktop applications include built-in automatic updates to ensure you always have the latest model.
              </p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
