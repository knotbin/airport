import { type PageProps } from "fresh";
import Header from "../islands/Header.tsx";
import { Partial } from "fresh/runtime";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="og:image" content="/og-image.jpg" />
        <meta name="og:title" content="Airport" />
        <meta
          name="og:description"
          content="
        Airport is an AT Protocol PDS Migration Tool that allows you to seamlessly
        migrate your account from one PDS to another.
        "
        />
        <meta name="og:locale" content="en_US" />
        <title>Airport</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id={Deno.env.get("UMAMI_ID")}
      >
      </script>
      <body f-client-nav>
        <Partial name="body">
          <Header />
          <main className="pt-8">
            <Component />
          </main>
        </Partial>
      </body>
    </html>
  );
}
