import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: {
    default: "Trading Pro Max",
    template: "%s | Trading Pro Max"
  },
  description: "Professional-grade trading terminal for Trading Pro Max."
};

export const viewport = {
  themeColor: "#040815",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
