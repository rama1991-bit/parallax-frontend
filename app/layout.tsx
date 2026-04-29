import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Parallax",
  description: "Narrative intelligence feed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="pb-16 md:pb-0">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
