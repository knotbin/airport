import consola from "consola";
import { TestEnvironment } from "../utils/test-env";
import { Agent, CredentialSession } from "@atproto/api";
import { TEST_CONFIG } from "../utils/config";
import { SMTPServer } from "smtp-server";

async function main() {
  const env = await TestEnvironment.create();

  const session = new CredentialSession(new URL(env.sourcePds.url));

  const result = await session.createAccount({
    handle: TEST_CONFIG.handle,
    password: TEST_CONFIG.password,
    email: TEST_CONFIG.email,
  });

  const fs = await import("fs/promises");
  const envPath = "../.env";

  try {
    const envContent = (await fs.readFile(envPath, "utf8").catch(() => "")) ||
      "";
    if (!envContent.includes(`PLC_URL=${env.plc.url}`)) {
      await fs.writeFile(
        envPath,
        `${envContent}PLC_URL=${env.plc.url}\n`,
        "utf8",
      );
      consola.info(`PLC_URL set to ${env.plc.url} in .env file`);
    } else {
      consola.info(`PLC_URL is already set to ${env.plc.url} in .env file`);
    }
  } catch (error) {
    consola.error("Failed to update .env file", error);
    throw error;
  }

  consola.success("Test environment created successfully");
  consola.info(`PLC running at ${env.plc.url}`);
  consola.info(`Source PDS running at ${env.sourcePds.url}`);
  consola.info(`Target PDS running at ${env.targetPds.url}`);
  consola.info(`Login as 👤 ${result.data.did} 🔑 ${TEST_CONFIG.password}`);
}

main();
