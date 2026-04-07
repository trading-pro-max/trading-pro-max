export const metadata = {
  title: "Trading Pro Max",
  description: "Core Rebuild"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#020617", color: "white", fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}