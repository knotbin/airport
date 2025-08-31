import { useEffect, useState } from "preact/hooks";
import { MigrationStateInfo } from "../lib/migration-types.ts";
import AccountCreationStep from "./migration-steps/AccountCreationStep.tsx";
import DataMigrationStep from "./migration-steps/DataMigrationStep.tsx";
import IdentityMigrationStep from "./migration-steps/IdentityMigrationStep.tsx";
import FinalizationStep from "./migration-steps/FinalizationStep.tsx";
import MigrationCompletion from "../components/MigrationCompletion.tsx";

/**
 * The migration progress props.
 * @type {MigrationProgressProps}
 */
interface MigrationProgressProps {
  service: string;
  handle: string;
  email: string;
  password: string;
  invite?: string;
}

/**
 * The migration progress component.
 * @param props - The migration progress props
 * @returns The migration progress component
 * @component
 */
export default function MigrationProgress(props: MigrationProgressProps) {
  const [migrationState, setMigrationState] = useState<
    MigrationStateInfo | null
  >(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [hasError, setHasError] = useState(false);

  const credentials = {
    service: props.service,
    handle: props.handle,
    email: props.email,
    password: props.password,
    invite: props.invite,
  };

  const validateParams = () => {
    if (!props.service?.trim()) {
      setHasError(true);
      return false;
    }
    if (!props.handle?.trim()) {
      setHasError(true);
      return false;
    }
    if (!props.email?.trim()) {
      setHasError(true);
      return false;
    }
    if (!props.password?.trim()) {
      setHasError(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    console.log("Starting migration with props:", {
      service: props.service,
      handle: props.handle,
      email: props.email,
      hasPassword: !!props.password,
      invite: props.invite,
    });

    // Check migration state first
    const checkMigrationState = async () => {
      try {
        const migrationResponse = await fetch("/api/migration-state");
        if (migrationResponse.ok) {
          const migrationData = await migrationResponse.json();
          setMigrationState(migrationData);

          if (!migrationData.allowMigration) {
            setHasError(true);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check migration state:", error);
        setHasError(true);
        return;
      }

      if (!validateParams()) {
        console.log("Parameter validation failed");
        return;
      }

      // Start with the first step
      setCurrentStep(0);
    };

    checkMigrationState();
  }, []);

  const handleStepComplete = (stepIndex: number) => {
    console.log(`Step ${stepIndex} completed`);
    setCompletedSteps((prev) => new Set([...prev, stepIndex]));

    // Move to next step if not the last one
    if (stepIndex < 3) {
      setCurrentStep(stepIndex + 1);
    }
  };

  const handleStepError = (
    stepIndex: number,
    error: string,
    isVerificationError?: boolean,
  ) => {
    console.error(`Step ${stepIndex} error:`, error, { isVerificationError });
    // Errors are handled within each step component
  };

  const isStepActive = (stepIndex: number) => {
    return currentStep === stepIndex && !hasError;
  };

  const _isStepCompleted = (stepIndex: number) => {
    return completedSteps.has(stepIndex);
  };

  const allStepsCompleted = completedSteps.size === 4;

  return (
    <div class="space-y-8">
      {/* Migration state alert */}
      {migrationState && !migrationState.allowMigration && (
        <div
          class={`p-4 rounded-lg border ${
            migrationState.state === "maintenance"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div class="flex items-center">
            <div
              class={`mr-3 ${
                migrationState.state === "maintenance"
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {migrationState.state === "maintenance" ? "⚠️" : "🚫"}
            </div>
            <div>
              <h3 class="font-semibold mb-1">
                {migrationState.state === "maintenance"
                  ? "Maintenance Mode"
                  : "Service Unavailable"}
              </h3>
              <p class="text-sm">{migrationState.message}</p>
            </div>
          </div>
        </div>
      )}

      <div class="space-y-4">
        <AccountCreationStep
          credentials={credentials}
          onStepComplete={() => handleStepComplete(0)}
          onStepError={(error, isVerificationError) =>
            handleStepError(0, error, isVerificationError)}
          isActive={isStepActive(0)}
        />

        <DataMigrationStep
          credentials={credentials}
          onStepComplete={() => handleStepComplete(1)}
          onStepError={(error, isVerificationError) =>
            handleStepError(1, error, isVerificationError)}
          isActive={isStepActive(1)}
        />

        <IdentityMigrationStep
          credentials={credentials}
          onStepComplete={() => handleStepComplete(2)}
          onStepError={(error, isVerificationError) =>
            handleStepError(2, error, isVerificationError)}
          isActive={isStepActive(2)}
        />

        <FinalizationStep
          credentials={credentials}
          onStepComplete={() => handleStepComplete(3)}
          onStepError={(error, isVerificationError) =>
            handleStepError(3, error, isVerificationError)}
          isActive={isStepActive(3)}
        />
      </div>

      <MigrationCompletion isVisible={allStepsCompleted} />
    </div>
  );
}
