import type { ReactNode } from "react";
export const metadata = {
  title: "Your Clickmap workspace",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 24,
          background: "#f5f5ec",
          color: "#244333",
          fontFamily: "system-ui",
        }}
      >
        {children}
      </body>
    </html>
  );
}
