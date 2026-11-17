import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "住宅ローン比較・シミュレーション",
  description: "返済シミュレーション、金融機関・商品比較、借り換え診断、借入可能額の目安を確認できます。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
