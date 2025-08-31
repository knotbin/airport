import { IS_BROWSER } from "fresh/runtime";
import { ComponentChildren } from "preact";

export type StepStatus =
  | "pending"
  | "in-progress"
  | "verifying"
  | "completed"
  | "error";

export interface MigrationStepProps {
  name: string;
  status: StepStatus;
  error?: string;
  isVerificationError?: boolean;
  index: number;
  onRetryVerification?: (index: number) => void;
  children?: ComponentChildren;
}

export function MigrationStep({
  name,
  status,
  error,
  isVerificationError,
  index,
  onRetryVerification,
  children,
}: MigrationStepProps) {
  return (
    <div key={name} class={getStepClasses(status)}>
      {getStepIcon(status)}
      <div class="flex-1">
        <p
          class={`font-medium ${
            status === "error"
              ? "text-red-900 dark:text-red-200"
              : status === "completed"
              ? "text-green-900 dark:text-green-200"
              : status === "in-progress"
              ? "text-blue-900 dark:text-blue-200"
              : "text-gray-900 dark:text-gray-200"
          }`}
        >
          {getStepDisplayName(
            { name, status, error, isVerificationError },
            index,
          )}
        </p>
        {error && (
          <div class="mt-1">
            <p class="text-sm text-red-600 dark:text-red-400">
              {(() => {
                try {
                  const err = JSON.parse(error);
                  return err.message || error;
                } catch {
                  return error;
                }
              })()}
            </p>
            {isVerificationError && onRetryVerification && (
              <div class="flex space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => onRetryVerification(index)}
                  class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors duration-200 dark:bg-blue-500 dark:hover:bg-blue-400"
                  disabled={!IS_BROWSER}
                >
                  Retry Verification
                </button>
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function getStepDisplayName(
  step: Pick<
    MigrationStepProps,
    "name" | "status" | "error" | "isVerificationError"
  >,
  index: number,
) {
  if (step.status === "completed") {
    switch (index) {
      case 0:
        return "Account Created";
      case 1:
        return "Data Migrated";
      case 2:
        return "Identity Migrated";
      case 3:
        return "Migration Finalized";
    }
  }

  if (step.status === "in-progress") {
    switch (index) {
      case 0:
        return "Creating your new account...";
      case 1:
        return "Migrating your data...";
      case 2:
        return step.name ===
            "Enter the token sent to your email to complete identity migration"
          ? step.name
          : "Migrating your identity...";
      case 3:
        return "Finalizing migration...";
    }
  }

  if (step.status === "verifying") {
    switch (index) {
      case 0:
        return "Verifying account creation...";
      case 1:
        return "Verifying data migration...";
      case 2:
        return "Verifying identity migration...";
      case 3:
        return "Verifying migration completion...";
    }
  }

  return step.name;
}

function getStepIcon(status: StepStatus) {
  switch (status) {
    case "pending":
      return (
        <div class="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
          <div class="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      );
    case "in-progress":
      return (
        <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex items-center justify-center">
          <div class="w-3 h-3 rounded-full bg-blue-500" />
        </div>
      );
    case "verifying":
      return (
        <div class="w-8 h-8 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin flex items-center justify-center">
          <div class="w-3 h-3 rounded-full bg-yellow-500" />
        </div>
      );
    case "completed":
      return (
        <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            class="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    case "error":
      return (
        <div class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
          <svg
            class="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
  }
}

function getStepClasses(status: StepStatus) {
  const baseClasses =
    "flex items-center space-x-3 p-4 rounded-lg transition-colors duration-200";
  switch (status) {
    case "pending":
      return `${baseClasses} bg-gray-50 dark:bg-gray-800`;
    case "in-progress":
      return `${baseClasses} bg-blue-50 dark:bg-blue-900`;
    case "verifying":
      return `${baseClasses} bg-yellow-50 dark:bg-yellow-900`;
    case "completed":
      return `${baseClasses} bg-green-50 dark:bg-green-900`;
    case "error":
      return `${baseClasses} bg-red-50 dark:bg-red-900`;
  }
}
