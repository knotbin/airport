/**
 * The migration state info.
 * @type {MigrationStateInfo}
 */
export interface MigrationStateInfo {
  state: "up" | "issue" | "maintenance";
  message: string;
  allowMigration: boolean;
}

/**
 * The migration progress props.
 * @type {MigrationProgressProps}
 */
export interface MigrationProgressProps {
  service: string;
  handle: string;
  email: string;
  password: string;
  invite?: string;
}

/**
 * The migration step.
 * @type {MigrationStep}
 */
export interface MigrationStep {
  name: string;
  status: "pending" | "in-progress" | "verifying" | "completed" | "error";
  error?: string;
  isVerificationError?: boolean;
}

export enum MigrationErrorType {
  NOT_ALLOWED = "NOT_ALLOWED",
  NETWORK = "NETWORK",
  OTHER = "OTHER",
}

export class MigrationError extends Error {
  stepIndex: number;
  type: MigrationErrorType;

  constructor(message: string, stepIndex: number, type: MigrationErrorType) {
    super(message);
    this.name = "MigrationError";
    this.stepIndex = stepIndex;
    this.type = type;
  }
}

export class MigrationClient {
  private updateStepStatus: (
    stepIndex: number,
    status: MigrationStep["status"],
    error?: string,
    isVerificationError?: boolean,
  ) => void;
  private setRetryAttempts?: (value: (prev: Record<number, number>) => Record<number, number>) => void;
  private setShowContinueAnyway?: (value: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
  private baseUrl = "";
  private nextStepHook?: (stepNum: number) => unknown;

  constructor({
    updateStepStatus,
    setRetryAttempts,
    setShowContinueAnyway,
    baseUrl = "",
    nextStepHook,
  }: {
    updateStepStatus: (
      stepIndex: number,
      status: MigrationStep["status"],
      error?: string,
      isVerificationError?: boolean,
    ) => void;
    setRetryAttempts?: (value: (prev: Record<number, number>) => Record<number, number>) => void;
    setShowContinueAnyway?: (value: (prev: Record<number, boolean>) => Record<number, boolean>) => void;
    baseUrl?: string;
    nextStepHook?: (stepNum: number) => unknown;
  }) {
    this.updateStepStatus = updateStepStatus;
    this.setRetryAttempts = setRetryAttempts;
    this.setShowContinueAnyway = setShowContinueAnyway;
    this.baseUrl = baseUrl;
    this.nextStepHook = nextStepHook;
  }

  async checkState() {
    try {
      const migrationResponse = await fetch(`${this.baseUrl}/api/migration-state`);
      if (migrationResponse.ok) {
        const migrationData = await migrationResponse.json();

        if (!migrationData.allowMigration) {
          throw new MigrationError(
            migrationData.message,
            0,
            MigrationErrorType.NOT_ALLOWED,
          );
        }

        return migrationData;
      }
    } catch (error) {
      console.error("Error checking migration state:", error);
      throw new MigrationError(
        "Unable to verify migration availability",
        0,
        MigrationErrorType.OTHER,
      );
    }
  }

  async startMigration(props: MigrationProgressProps) {
    console.log("Starting migration with props:", {
      service: props.service,
      handle: props.handle,
      email: props.email,
      hasPassword: !!props.password,
      invite: props.invite,
    });

    try {
      // Step 1: Create Account
      this.updateStepStatus(0, "in-progress");
      console.log("Starting account creation...");

      try {
        const createRes = await fetch(`${this.baseUrl}/api/migrate/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: props.service,
            handle: props.handle,
            password: props.password,
            email: props.email,
            ...(props.invite ? { invite: props.invite } : {}),
          }),
        });

        console.log("Create account response status:", createRes.status);
        const responseText = await createRes.text();
        console.log("Create account response:", responseText);

        if (!createRes.ok) {
          try {
            const json = JSON.parse(responseText);
            throw new Error(json.message || "Failed to create account");
          } catch {
            throw new Error(responseText || "Failed to create account");
          }
        }

        try {
          const jsonData = JSON.parse(responseText);
          if (!jsonData.success) {
            throw new Error(jsonData.message || "Account creation failed");
          }
        } catch (e) {
          console.log("Response is not JSON or lacks success field:", e);
        }

        this.updateStepStatus(0, "verifying");
        const verified = await this.verifyStep(0);
        if (!verified) {
          console.log(
            "Account creation: Verification failed, waiting for user action",
          );
          return;
        }

        this.updateStepStatus(0, "completed");
        // Continue to next step
        await this.continueToNextStep(1);
      } catch (error) {
        this.updateStepStatus(
          0,
          "error",
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    } catch (error) {
      console.error("Migration error in try/catch:", error);
    }
  }

  async startDataMigration() {
    // Step 2: Migrate Data
    this.updateStepStatus(1, "in-progress");
    console.log("Starting data migration...");

    // Step 2.1: Migrate Repo
    console.log("Data migration: Starting repo migration");
    const repoRes = await fetch(`${this.baseUrl}/api/migrate/data/repo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    console.log("Repo migration: Response status:", repoRes.status);
    const repoText = await repoRes.text();
    console.log("Repo migration: Raw response:", repoText);

    if (!repoRes.ok) {
      try {
        const json = JSON.parse(repoText);
        console.error("Repo migration: Error response:", json);
        throw new Error(json.message || "Failed to migrate repo");
      } catch {
        console.error("Repo migration: Non-JSON error response:", repoText);
        throw new Error(repoText || "Failed to migrate repo");
      }
    }

    // Step 2.2: Migrate Blobs
    console.log("Data migration: Starting blob migration");
    const blobsRes = await fetch(`${this.baseUrl}/api/migrate/data/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    console.log("Blob migration: Response status:", blobsRes.status);
    const blobsText = await blobsRes.text();
    console.log("Blob migration: Raw response:", blobsText);

    if (!blobsRes.ok) {
      try {
        const json = JSON.parse(blobsText);
        console.error("Blob migration: Error response:", json);
        throw new Error(json.message || "Failed to migrate blobs");
      } catch {
        console.error(
          "Blob migration: Non-JSON error response:",
          blobsText,
        );
        throw new Error(blobsText || "Failed to migrate blobs");
      }
    }

    // Step 2.3: Migrate Preferences
    console.log("Data migration: Starting preferences migration");
    const prefsRes = await fetch(`${this.baseUrl}/api/migrate/data/prefs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    console.log("Preferences migration: Response status:", prefsRes.status);
    const prefsText = await prefsRes.text();
    console.log("Preferences migration: Raw response:", prefsText);

    if (!prefsRes.ok) {
      try {
        const json = JSON.parse(prefsText);
        console.error("Preferences migration: Error response:", json);
        throw new Error(json.message || "Failed to migrate preferences");
      } catch {
        console.error(
          "Preferences migration: Non-JSON error response:",
          prefsText,
        );
        throw new Error(prefsText || "Failed to migrate preferences");
      }
    }

    console.log("Data migration: Starting verification");
    this.updateStepStatus(1, "verifying");
    const verified = await this.verifyStep(1);
    console.log("Data migration: Verification result:", verified);
    if (!verified) {
      console.log(
        "Data migration: Verification failed, waiting for user action",
      );
      return;
    }

    this.updateStepStatus(1, "completed");
    // Continue to next step
    await this.continueToNextStep(2);
  }

  async startIdentityMigration() {
    // Step 3: Start Identity Migration (just trigger the email)
    this.updateStepStatus(2, "in-progress");
    console.log("Starting identity migration...");

    try {
      const identityRes = await fetch(`${this.baseUrl}/api/migrate/identity/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const identityData = await identityRes.text();

      if (!identityRes.ok) {
        try {
          const json = JSON.parse(identityData);
          throw new Error(
            json.message || "Failed to start identity migration",
          );
        } catch {
          throw new Error(
            identityData || "Failed to start identity migration",
          );
        }
      }

      // Update the step to show token input
      this.updateStepStatus(2, "in-progress");
    } catch (error) {
      this.updateStepStatus(
        2,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async handleIdentityMigration(token: string) {
    if (!token) {
      throw new Error("Token is required");
    }

    const identityRes = await fetch(
      `${this.baseUrl}/api/migrate/identity/sign?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );

    const identityData = await identityRes.text();
    if (!identityRes.ok) {
      try {
        const json = JSON.parse(identityData);
        throw new Error(
          json.message || "Failed to complete identity migration",
        );
      } catch {
        throw new Error(
          identityData || "Failed to complete identity migration",
        );
      }
    }

    let data;
    try {
      data = JSON.parse(identityData);
      if (!data.success) {
        throw new Error(data.message || "Identity migration failed");
      }
    } catch {
      throw new Error("Invalid response from server");
    }

    // Verify the identity migration succeeded
    this.updateStepStatus(2, "verifying");
    const verified = await this.verifyStep(2, true);
    if (!verified) {
      console.log(
        "Identity migration: Verification failed after token submission",
      );
      throw new Error("Identity migration verification failed");
    }

    this.updateStepStatus(2, "completed");
  }

  async finalizeMigration() {
    // Step 4: Finalize Migration
    this.updateStepStatus(3, "in-progress");
    const finalizeRes = await fetch(`${this.baseUrl}/api/migrate/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const finalizeData = await finalizeRes.text();
    if (!finalizeRes.ok) {
      try {
        const json = JSON.parse(finalizeData);
        throw new Error(json.message || "Failed to finalize migration");
      } catch {
        throw new Error(finalizeData || "Failed to finalize migration");
      }
    }

    try {
      const jsonData = JSON.parse(finalizeData);
      if (!jsonData.success) {
        throw new Error(jsonData.message || "Finalization failed");
      }
    } catch {
      throw new Error("Invalid response from server during finalization");
    }

    this.updateStepStatus(3, "verifying");
    const verified = await this.verifyStep(3);
    if (!verified) {
      console.log(
        "Finalization: Verification failed, waiting for user action",
      );
      return;
    }

    this.updateStepStatus(3, "completed");
  }

  async retryVerification(stepNum: number, steps: MigrationStep[]) {
    console.log(`Retrying verification for step ${stepNum + 1}`);
    const isManualSubmission = stepNum === 2 &&
      steps[2].name ===
        "Enter the token sent to your email to complete identity migration";
    const verified = await this.verifyStep(stepNum, isManualSubmission);

    if (verified && stepNum < 3) {
      await this.continueToNextStep(stepNum + 1);
    }
  }

  async verifyStep(
    stepNum: number,
    isManualSubmission: boolean = false,
  ) {
    console.log(`Verification: Starting step ${stepNum + 1}`);

    // Skip automatic verification for step 2 (identity migration) unless it's after manual token submission
    if (stepNum === 2 && !isManualSubmission) {
      console.log(
        `Verification: Skipping automatic verification for identity migration step`,
      );
      return false;
    }

    this.updateStepStatus(stepNum, "verifying");
    try {
      console.log(`Verification: Fetching status for step ${stepNum + 1}`);
      const res = await fetch(`${this.baseUrl}/api/migrate/status?step=${stepNum + 1}`);
      console.log(`Verification: Status response status:`, res.status);
      const data = await res.json();
      console.log(`Verification: Status data for step ${stepNum + 1}:`, data);

      if (data.ready) {
        console.log(`Verification: Step ${stepNum + 1} is ready`);
        this.updateStepStatus(stepNum, "completed");

        // Reset retry state on success if callbacks are available
        if (this.setRetryAttempts) {
          this.setRetryAttempts((prev: any) => ({ ...prev, [stepNum]: 0 }));
        }
        if (this.setShowContinueAnyway) {
          this.setShowContinueAnyway((prev: any) => ({ ...prev, [stepNum]: false }));
        }

        return true;
      } else {
        console.log(
          `Verification: Step ${stepNum + 1} is not ready:`,
          data.reason,
        );
        const statusDetails = {
          activated: data.activated,
          validDid: data.validDid,
          repoCommit: data.repoCommit,
          repoRev: data.repoRev,
          repoBlocks: data.repoBlocks,
          expectedRecords: data.expectedRecords,
          indexedRecords: data.indexedRecords,
          privateStateValues: data.privateStateValues,
          expectedBlobs: data.expectedBlobs,
          importedBlobs: data.importedBlobs,
        };
        console.log(
          `Verification: Step ${stepNum + 1} status details:`,
          statusDetails,
        );
        const errorMessage = `${
          data.reason || "Verification failed"
        }\nStatus details: ${JSON.stringify(statusDetails, null, 2)}`;

        // Track retry attempts only if callbacks are available
        if (this.setRetryAttempts && this.setShowContinueAnyway) {
          this.setRetryAttempts((prev: any) => ({
            ...prev,
            [stepNum]: (prev[stepNum] || 0) + 1,
          }));

          // Show continue anyway option if this is the second failure
          this.setRetryAttempts((prev: any) => {
            const currentAttempts = (prev[stepNum] || 0) + 1;
            if (currentAttempts >= 2) {
              this.setShowContinueAnyway!((prevShow: any) => ({
                ...prevShow,
                [stepNum]: true,
              }));
            }
            return { ...prev, [stepNum]: currentAttempts };
          });

          this.updateStepStatus(stepNum, "error", errorMessage, true);
        } else {
          // No retry callbacks - just fail
          this.updateStepStatus(stepNum, "error", errorMessage, false);
        }

        return false;
      }
    } catch (e) {
      console.error(`Verification: Error in step ${stepNum + 1}:`, e);

      // Track retry attempts only if callbacks are available
      if (this.setRetryAttempts && this.setShowContinueAnyway) {
        this.setRetryAttempts((prev: any) => {
          const currentAttempts = (prev[stepNum] || 0) + 1;
          if (currentAttempts >= 2) {
            this.setShowContinueAnyway!((prevShow: any) => ({
              ...prevShow,
              [stepNum]: true,
            }));
          }
          return { ...prev, [stepNum]: currentAttempts };
        });

        this.updateStepStatus(
          stepNum,
          "error",
          e instanceof Error ? e.message : String(e),
          true,
        );
      } else {
        // No retry callbacks - just fail
        this.updateStepStatus(
          stepNum,
          "error",
          e instanceof Error ? e.message : String(e),
          false,
        );
      }

      return false;
    }
  }

  async continueToNextStep(stepNum: number) {
    console.log(`Continuing to step ${stepNum + 1}`);
    try {
      switch (stepNum) {
        case 1:
          await this.startDataMigration();
          break;
        case 2:
          await this.startIdentityMigration(); 
          break;
        case 3:
          await this.finalizeMigration();
          break;
      }

      this.nextStepHook?.(stepNum);
    } catch (error) {
      console.error(`Error in step ${stepNum + 1}:`, error);
      this.updateStepStatus(
        stepNum,
        "error",
        error instanceof Error ? error.message : String(error),
      );
    }
}
}
