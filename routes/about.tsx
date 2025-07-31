import { Button } from "../components/Button.tsx";

export default function About() {
  return (
    <>
      <div class="px-2 sm:px-4 py-4 sm:py-8 mx-auto">
        <div class="max-w-screen-lg mx-auto flex flex-col items-center justify-center">
          <div class="prose dark:prose-invert max-w-none w-full mb-0">
            <h1 class="text-3xl font-bold text-center mb-8">
              About AT Protocol
            </h1>

            <div class="space-y-6">
              <section>
                <h2 class="text-2xl font-semibold mb-4">
                  What is AT Protocol?
                </h2>
                <p class="text-gray-600 dark:text-gray-300">
                  AT Protocol (Authenticated Transfer Protocol) is the
                  foundation of Bluesky and other social apps like
                  <a href="https://tangled.sh">Tangled</a>,
                  <a href="https://spark.com">Spark</a>, and more. Unlike
                  traditional social platforms that lock your data and identity
                  to a single service, AT Protocol gives you complete control
                  over your digital presence. Think of it as an open standard
                  for social networking, similar to how email works across
                  different providers.
                </p>
              </section>

              <section>
                <h2 class="text-2xl font-semibold mb-4">Key Features</h2>
                <ul class="list-disc pl-6 space-y-4 text-gray-600 dark:text-gray-300">
                  <li>
                    <strong>PDS Servers:</strong>{" "}
                    PDS servers are where your data is stored. They can be run
                    by anyone, and they are very lightweight, allowing you to
                    choose which one to use or run your own. PDS servers just
                    store your data, meaning you don't have to switch PDS
                    servers to use a different app or service. You can have one
                    PDS while using many different apps and services with the
                    same account.
                  </li>
                  <li>
                    <strong>Decentralized Identity:</strong>{" "}
                    Your account is tied to a DID (Decentralized Identifier)
                    rather than your handle/username. This means you can move
                    your entire account, including your followers and content,
                    to any PDS by changing where your DID points. It's also the
                    reason you can use any domain as your handle, because your
                    identity is not tied to your handle. Your handle can change,
                    but your DID will always remain the same.
                  </li>
                  <li>
                    <strong>Portable Content:</strong>{" "}
                    All your posts, likes, and other social data are stored in
                    your Personal Data Server (PDS). You can switch PDS
                    providers without losing any content or connections.
                  </li>
                  <li>
                    <strong>Architecture:</strong>{" "}
                    The protocol uses a three-tier architecture: Personal Data
                    Servers (PDS) store your content, relays broadcast a stream
                    of all events on all PDSes, and AppViews process and serve
                    that stream into content for users. This means when you make
                    a post, the content is stored on your PDS, picked up by
                    relays, and AppViews listen to those relays to deliver that
                    post to all users.
                  </li>
                  <li>
                    <strong>Algorithmic Choice:</strong>{" "}
                    You're not locked into a single algorithm for your feed.
                    Different services can offer different ways of curating
                    content, and you can choose which one you prefer. Bluesky
                    offers a way to make custom feeds, but even if it didn't,
                    different apps could still offer their own algorithms for
                    curating content.
                  </li>
                </ul>
              </section>

              <section>
                <h2 class="text-2xl font-semibold mb-4">Learn More</h2>
                <div class="space-y-4">
                  <p class="text-gray-600 dark:text-gray-300">
                    Want to dive deeper into AT Protocol? Check out these
                    resources:
                  </p>
                  <ul class="list-none space-y-2">
                    <li>
                      <a
                        href="https://atproto.com"
                        class="text-blue-500 hover:underline"
                      >
                        Official AT Protocol Docs
                      </a>{" "}
                      - The main source for protocol specs and information
                    </li>
                    <li>
                      <a
                        href="https://github.com/bluesky-social/atproto"
                        class="text-blue-500 hover:underline"
                      >
                        GitHub Repository
                      </a>{" "}
                      - View the protocol implementation
                    </li>
                    <li>
                      <a
                        href="https://atproto.wiki"
                        class="text-blue-500 hover:underline"
                      >
                        AT Protocol Wiki
                      </a>{" "}
                      - Community-driven documentation and resources
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <div class="mt-8 text-center">
              <Button
                href="/"
                color="blue"
                label="Back to Home"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
