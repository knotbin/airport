import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";

import { Agent, CredentialSession } from "@atproto/api";
import { consola } from "consola";
import { TestEnvironment } from "../utils/test-env.ts";
import { TEST_CONFIG } from "../utils/config.ts";
import {
  MigrationClient,
  MigrationError,
  MigrationErrorType,
} from "../../lib/client.ts";

describe("e2e migration test", () => {
  let testEnv: TestEnvironment;
  let migrationClient: MigrationClient;
  let agent: Agent;
  let cookieHelper: ReturnType<typeof createCookieFetch> | null = null;

  async function isServerAvailable(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok || res.status < 500;
    } catch {
      return false;
    }
  }

  function createCookieFetch(baseUrl: string) {
    const originalFetch = globalThis.fetch.bind(globalThis);
    const cookieStore = new Map<string, string>();
    const base = new URL(baseUrl);

    function mergeSetCookie(headerVal: string | null) {
      if (!headerVal) return;
      const parts = headerVal.split(",");
      for (const raw of parts) {
        const pair = raw.trim().split(";")[0];
        const [name, value] = pair.split("=");
        if (name && value) cookieStore.set(name, value);
      }
    }

    function cookiesHeader(): string {
      return Array.from(cookieStore.entries()).map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }

    globalThis.fetch = async (
      input: Request | URL | string,
      init?: RequestInit,
    ) => {
      let finalInput: Request | URL | string;
      let finalInit: RequestInit | undefined;

      if (input instanceof Request) {
        const url = new URL(input.url, base);
        const headers = new Headers(input.headers);

        if (url.origin === base.origin) {
          const existing = headers.get("cookie");
          const jar = cookiesHeader();
          if (jar) {
            headers.set("cookie", existing ? `${existing}; ${jar}` : jar);
          }
        }

        finalInput = new Request(url, {
          method: input.method,
          headers: headers,
          body: input.body,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          integrity: input.integrity,
          signal: input.signal,
          duplex: input.body ? "half" : undefined,
        } as RequestInit);
        finalInit = init;
      } else {
        const urlObj = input instanceof URL ? input : new URL(input, base);
        const headers = new Headers(init?.headers || {});

        if (urlObj.origin === base.origin) {
          const existing = headers.get("cookie");
          const jar = cookiesHeader();
          if (jar) {
            headers.set("cookie", existing ? `${existing}; ${jar}` : jar);
          }
        }

        finalInput = urlObj;
        finalInit = { ...init, headers };
      }

      const res = await originalFetch(finalInput, finalInit);
      mergeSetCookie(res.headers.get("set-cookie"));
      return res;
    };

    return {
      addCookiesFrom: (res: Response) =>
        mergeSetCookie(res.headers.get("set-cookie")),
      getAll: () => cookiesHeader(),
    };
  }

  beforeAll(async () => {
    const serverAvailable = await isServerAvailable(TEST_CONFIG.airportUrl);
    if (!serverAvailable) {
      throw new Error(
        `Airport server not available at ${TEST_CONFIG.airportUrl}; tests will be skipped.`,
      );
    }

    try {
      testEnv = await TestEnvironment.create();
      console.log(`Using Airport URL: ${TEST_CONFIG.airportUrl}`);
      migrationClient = new MigrationClient(
        {
          baseUrl: TEST_CONFIG.airportUrl,
          updateStepStatus(stepIndex, status, error) {
            consola.log(`Step ${stepIndex} updated: ${status}`);
            if (error) {
              consola.error(`Step ${stepIndex} error: ${error}`);
              throw new MigrationError(
                `Step ${stepIndex} failed: ${error}`,
                stepIndex,
                MigrationErrorType.OTHER,
              );
            }
          },
          async nextStepHook(stepNum) {
            if (stepNum == 2) {
              const verificationCode = await testEnv.awaitMail(10000);
              consola.info(`Got verification code: ${verificationCode}`);

              await migrationClient.handleIdentityMigration(verificationCode);
              // If successful, continue to next step
              await migrationClient.finalizeMigration();
            }
          },
        },
      );
      cookieHelper = createCookieFetch(TEST_CONFIG.airportUrl);
      consola.success("Test environment setup completed");
    } catch (error) {
      consola.error("Failed to setup test environment:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await testEnv?.cleanup();
      consola.success("Test environment cleaned up");
    } catch (error) {
      consola.error("Failed to clean up test environment:", error);
    }
  });

  test("should create new account on source pds", async () => {
    const session = new CredentialSession(new URL(testEnv.sourcePds.url));

    const result = await session.createAccount({
      handle: TEST_CONFIG.handle,
      password: TEST_CONFIG.password,
      email: TEST_CONFIG.email,
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(
        `Failed to create source account: ${JSON.stringify(result)}`,
      );
    }

    agent = new Agent(session);

    consola.success(`Test account created on source PDS (${agent.did})`);
  });

  test("should create test data for source account", async () => {
    await agent.post({
      text: "Hello from Airport!",
    });

    consola.success("Post data created successfully");
  });

  test("should login via credentials", async () => {
    const loginRes = await fetch(`${TEST_CONFIG.airportUrl}/api/cred/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle: agent.assertDid,
        password: TEST_CONFIG.password,
      }),
    });

    expect(loginRes.ok).toBe(true);

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    cookieHelper?.addCookiesFrom(loginRes);

    consola.success("Successfully logged in via credentials");
  });

  test("should make sure i'm logged in", async () => {
    const meRes = await fetch(`${TEST_CONFIG.airportUrl}/api/me`, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (!meRes.ok) {
      throw new Error(`Failed to verify login: ${meRes.status}`);
    }

    const meData = await meRes.json();
    consola.log("User data:", meData);
    expect(meData.did).toBe(agent.assertDid);

    consola.success("Verified login via /api/me");
  });

  test("should start migration flow", async () => {
    await migrationClient.startMigration(
      {
        ...TEST_CONFIG,
        handle: TEST_CONFIG.targetHandle,
        service: testEnv.targetPds.url,
      },
    );

    consola.success("Migration flow completed successfully");
  });

  test("login to new pds", async () => {
    // login
    const session = new CredentialSession(new URL(testEnv.targetPds.url));

    const result = await session.login({
      identifier: agent.assertDid,
      password: TEST_CONFIG.password,
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(
        `Failed to login to target pds: ${JSON.stringify(result)}`,
      );
    }

    agent = new Agent(session);
  });

  test("make sure it's on correct pds", async () => {
    const doc = await testEnv.plc.getClient().getDocumentData(agent.assertDid);
    console.log(doc);
    expect(doc).toBeDefined();
    expect(doc.services["atproto_pds"]).toBeDefined();
    expect(doc.services["atproto_pds"].endpoint).toBe(testEnv.targetPds.url);
  });

  test("make sure data migrated successfully", async () => {
    const records = await agent.com.atproto.repo.listRecords({
      collection: "app.bsky.feed.post",
      repo: agent.assertDid,
    });

    console.log(records.data.records);

    expect(records.success).toBe(true);
    expect(records).toBeDefined();
    expect(Array.isArray(records.data.records)).toBe(true);
    expect(records.data.records.length).toBe(1);
  });

  test("should handle migration errors appropriately", async () => {
    try {
      // Try to create account with invalid params
      await migrationClient.startMigration({
        service: "invalid-service",
        handle: "invalid-handle",
        email: "invalid-email",
        password: "invalid-password",
      });

      // Should not reach here
      throw new Error("Expected migration to fail but it succeeded");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
