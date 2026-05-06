import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <Image src="/logo.png" alt="ALUNA Logo" width={100} height={100} className="footer-logo" style={{ objectFit: 'contain' }} />
          <div className="footer-title">ALUNA</div>
          <div className="footer-desc">
            AI Lung Analyzer, Advanced AI-powered lung nodule detection system leveraging Deep Learning and for real-time inference on CT scans.
          </div>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Product</h4>
            <Link href="/scan">Scan</Link>
            <Link href="/download">Download App</Link>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#">Documentation (coming soon)</a>
            <a href="#">API Reference (coming soon)</a>
            <a href="#">Model Architecture (coming soon)</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Medical Disclaimer</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; {year} ALUNA Detection Systems. All rights reserved.
        <span style={{ opacity: 0.5, marginLeft: 6 }}></span>
      </div>
    </footer>
  );
}
