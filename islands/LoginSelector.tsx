import { useState } from "preact/hooks"
import HandleInput from "./HandleInput.tsx"
import CredLogin from "./CredLogin.tsx"

/**
 * The login method selector for OAuth or Credential.
 * @returns The login method selector
 * @component
 */
export default function LoginMethodSelector() {
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'password'>('password')

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm max-w-md mx-auto w-full">
        <h2 className="text-xl font-semibold mb-4">Login with ATProto</h2>

        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setLoginMethod('oauth')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              loginMethod === 'oauth'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            OAuth
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod('password')}
            className={`flex-1 px-4 py-2 rounded-md transition-colors ${
              loginMethod === 'password'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Credential
          </button>
        </div>

        {loginMethod === 'oauth' && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-md text-sm">
            Note: OAuth login cannot be used for migrations.
          </div>
        )}

        {loginMethod === 'oauth' ? <HandleInput /> : <CredLogin />}

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
  )
}
