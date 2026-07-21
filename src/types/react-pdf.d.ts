// Type shim para @react-pdf/renderer 4.x (no incluye typings).
// Cubre solo lo que usamos en el export de PDF de reports.

declare module "@react-pdf/renderer" {
  import type { ReactElement, ReactNode } from "react";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyStyle = any;

  export const Document: (props: {
    children?: ReactNode;
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  }) => ReactElement;

  export const Page: (props: {
    size?: "A4" | "LETTER" | "LEGAL";
    style?: AnyStyle;
    children?: ReactNode;
  }) => ReactElement;

  export const Text: (props: {
    children?: ReactNode;
    style?: AnyStyle;
    fixed?: boolean;
  }) => ReactElement;

  export const View: (props: {
    children?: ReactNode;
    style?: AnyStyle;
    fixed?: boolean;
  }) => ReactElement;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const StyleSheet: { create<T>(styles: T): T };

  export function renderToBuffer(element: ReactElement): Promise<Buffer>;
  export function renderToStream(element: ReactElement): Promise<NodeJS.ReadableStream>;
  export function renderToString(element: ReactElement): Promise<string>;

  export const version: string;
}
