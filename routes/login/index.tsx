import { PageProps } from "$fresh/server.ts"
import { Head } from "$fresh/runtime.ts"
import LoginMethodSelector from "../../islands/LoginMethodSelector.tsx"

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
      <LoginMethodSelector />
    </>
  )
}
