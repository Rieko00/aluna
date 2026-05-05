import Link from 'next/link';
import { Activity } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <Activity size={28} className="footer-logo" />
          <div className="footer-title">ALUNA</div>
          <div className="footer-desc">
            Advanced AI-powered lung nodule detection system leveraging YOLOv8 and
            ONNX Runtime for real-time inference on CT scans.
          </div>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Product</h4>
            <Link href="/scan">Scan Hub</Link>
            <Link href="/download">Download App</Link>
            <Link href="/">Home</Link>
            <Link href="/about">About</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">API Reference</a>
            <a href="#">Model Architecture</a>
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
        <span style={{ opacity: 0.5, marginLeft: 6 }}>(Not for clinical use)</span>
      </div>
    </footer>
  );
}
