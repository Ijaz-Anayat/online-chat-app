import Providers from "@/components/Providers";
import "./globals.css";

export const metadata = {
  title: "SkyChat — Real-time Messaging",
  description: "Full-stack real-time chat with friends and groups",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
