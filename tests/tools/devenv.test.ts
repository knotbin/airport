import { TestEnvironment } from "../utils/test-env.ts";
import { Agent, CredentialSession } from "@atproto/api";
import { TEST_CONFIG } from "../utils/config.ts";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

describe("devenv.ts", () => {
  let env: TestEnvironment;
  let session: CredentialSession;
  beforeAll(async () => {
    env = await TestEnvironment.create();
    session = new CredentialSession(new URL(env.sourcePds.url));
  });

  afterAll(async () => {
    await env.cleanup();
  });

  it("should create test account", async () => {
    const result = await session.createAccount({
      handle: TEST_CONFIG.handle,
      password: TEST_CONFIG.password,
      email: TEST_CONFIG.email,
    });

    expect(result.success).toBe(true);
    expect(result.data.did).toBeDefined();
  });

  it("should request plc operation token and get token from mailbox", async () => {
    // Start waiting for mail before making the request
    const tokenPromise = env.awaitMail();

    const result = await new Agent(session).com.atproto.identity
      .requestPlcOperationSignature();
    expect(result.success).toBe(true);

    // Now await the token that should have been sent
    const token = await tokenPromise;
    expect(token).toBeDefined();
  });
});
