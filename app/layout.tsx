import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verra — Premium Community Platform for Creators",
  description: "Verra provides a space for creators to build communities from zero to millions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ height: "100%", background: "#000" }}>
      <body
        style={{
          margin: 0,
          padding: 0,
          height: "100%",
          background: "#000",
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          overflow: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
