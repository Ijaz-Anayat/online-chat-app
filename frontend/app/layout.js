import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "SkyChat — Real-time Messaging",
  description: "Full-stack real-time chat with friends and groups",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
