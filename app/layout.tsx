import "./globals.css";

export const metadata = {
  title: "AuthentiChain",
  description: "Blockchain invoice verification",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
