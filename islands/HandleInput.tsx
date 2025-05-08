import { useState } from 'preact/hooks'
import { JSX } from 'preact'

export default function HandleInput() {
  const [handle, setHandle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: JSX.TargetedEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!handle.trim()) return

    setError(null)
    setIsPending(true)

    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-red-500 mb-4 p-2 bg-red-50 dark:bg-red-950 dark:bg-opacity-30 rounded-md">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label
          htmlFor="handle"
          className="block mb-2 text-gray-700 dark:text-gray-300"
        >
          Enter your Bluesky handle:
        </label>
        <input
          id="handle"
          type="text"
          value={handle}
          onInput={(e) => setHandle((e.target as HTMLInputElement).value)}
          placeholder="example.bsky.social"
          disabled={isPending}
          className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 transition-colors"
        />
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
          You can also enter an AT Protocol PDS URL, i.e.{' '}
          <span className="whitespace-nowrap">https://bsky.social</span>
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`w-full px-4 py-2 rounded-md bg-blue-500 dark:bg-blue-600 text-white font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 relative ${
          isPending ? 'opacity-90 cursor-not-allowed' : ''
        }`}
      >
        <span className={isPending ? 'invisible' : ''}>Login</span>
        {isPending && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Connecting...</span>
          </span>
        )}
      </button>
    </form>
  )
} 