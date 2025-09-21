import type { Metadata } from "next";
import "@/src/App.css";


export const metadata: Metadata = {
  title: "Quizlet Refund",
  description: "Request Refund Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
      >
        {children}
        
      </body>
    </html>
  );
}
