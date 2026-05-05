import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "ALUNA – Lung Nodule Detection System",
  description:
    "AI-powered lung nodule detection using YOLOv8. Supports DICOM and standard image formats. Classifies nodules as Benign, Equivocal, or Malignant.",
  keywords: ["lung nodule", "CT scan", "DICOM", "YOLOv8", "ONNX", "cancer detection", "AI radiology"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="app-layout">
        <ThemeProvider defaultTheme="light" storageKey="aluna-theme">
          <Navbar />
          <div className="page-body">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
