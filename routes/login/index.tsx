import { PageProps } from "$fresh/server.ts"
import { Head } from "$fresh/runtime.ts"

import HandleInput from "../../islands/HandleInput.tsx"

export async function submitHandle(handle: string) {
  const response = await fetch('/api/oauth/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ handle }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Login failed')
  }

  const data = await response.json()

  // Add a small delay before redirecting for better UX
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Redirect to ATProto OAuth flow
  globalThis.location.href = data.redirectUrl
}

export default function Login(_props: PageProps) {
  return (
    <>
      <Head>
        <title>Login - Airport</title>
      </Head>
      <div className="flex flex-col gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm max-w-md mx-auto w-full">
          <h2 className="text-xl font-semibold mb-4">Login with ATProto</h2>

          <HandleInput />

          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Cancel
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
