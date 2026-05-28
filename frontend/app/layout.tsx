import type { Metadata } from "next";
import "./globals.css";
import { ClientNav } from "./components/ClientNav";

export const metadata: Metadata = {
  title: "薪资谈判作战室",
  description: "把简历、岗位、报价、信任和风险放到同一张桌面上，训练一次真正可复盘的谈薪决策。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="font-sans">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <ClientNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
