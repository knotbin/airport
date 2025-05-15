import { type PageProps } from "fresh";
import Header from "../islands/Header.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Airport</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Header />
        <main className="pt-8">
          <Component />
        </main>
      </body>
    </html>
  );
}
