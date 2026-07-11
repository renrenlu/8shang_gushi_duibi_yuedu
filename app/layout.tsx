import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const base = `${protocol}://${host}`;
  const title = "古诗词比较阅读｜50 组互动自学";
  const description = "完整收录 PDF 中的 50 组古诗词比较阅读，支持即时判题、错项解析、收藏复习和本地进度保存。";

  return {
    title,
    description,
    icons: { icon: "/art/spring.jpg", shortcut: "/art/spring.jpg" },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: `${base}/og.jpg`, width: 1200, height: 630, alt: "古诗词比较阅读，50 组互动自学" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${base}/og.jpg`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
