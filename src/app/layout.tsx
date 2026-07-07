import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Radiant Beauty - Belleza y Cuidado de la Piel",
    template: "%s | Radiant Beauty",
  },
  description:
    "Servicios profesionales de maquillaje artístico, dermocosmética y cuidado personalizado de la piel.",
  metadataBase: new URL("http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
