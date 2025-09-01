/**
 * Test environment utilities for setting up virtual PDS instances
 */

import { Agent } from "@atproto/api";
import { TestPds, TestPlc } from "@atproto/dev-env";
import { ComAtprotoServerCreateAccount } from "@atproto/api";
import { SMTPServer, SMTPServerAddress } from "smtp-server";
import * as cheerio from "cheerio";
import consola from "consola";

export interface TestPDSConfig {
  sourcePds: TestPds;
  targetPds: TestPds;
  plc: TestPlc;
}

const PLC_PORT = 2580;
const PDS_A_PORT = 2583;
const PDS_B_PORT = 2584;
const SMTP_PORT = 2525;

export type TestAccount = ComAtprotoServerCreateAccount.OutputSchema & {
  agent: Agent;
};

export interface Email {
  to: SMTPServerAddress[];
  from: false | SMTPServerAddress;
  subject?: string;
  body: string;
  verificationCode?: string;
  timestamp: Date;
}

/**
 * Create a test environment with virtual PDS instances
 */
export class TestEnvironment {
  sourcePds: TestPds;
  targetPds: TestPds;
  plc: TestPlc;
  smtp: SMTPServer;
  private mailbox: Email[] = [];
  private codeWaiters: Map<string, (code: string) => void> = new Map();

  constructor(
    sourcePds: TestPds,
    targetPds: TestPds,
    plc: TestPlc,
    smtp: SMTPServer,
  ) {
    this.sourcePds = sourcePds;
    this.targetPds = targetPds;
    this.plc = plc;
    this.smtp = smtp;
  }

  static async create(): Promise<TestEnvironment> {
    const plc = await TestPlc.create({
      port: PLC_PORT,
    });

    const pds = await TestEnvironment.setupMockPDS(plc.url);
    const env = new TestEnvironment(
      pds.sourcePds,
      pds.targetPds,
      plc,
      await env.createSMTPServer(),
    );

    return env;
  }

  /**
   * Get all emails in the mailbox
   */
  getMail(): Email[] {
    return [...this.mailbox];
  }

  /**
   * Clear all emails from the mailbox
   */
  clearMail(): void {
    this.mailbox = [];
  }

  /**
   * Wait for a verification code to arrive in an email
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise that resolves with the verification code
   */
  async awaitMail(timeoutMs: number = 10000): Promise<string> {
    // First, check if a verification code is already present in the mailbox
    const existing = this.mailbox.find((email) => email.verificationCode);
    if (existing && existing.verificationCode) {
      return existing.verificationCode;
    }

    // Otherwise, wait for a new code to arrive
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.codeWaiters.delete(waiterId);
        reject(
          new Error(
            `Timeout waiting for verification code after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      const waiterId = Date.now().toString();
      this.codeWaiters.set(waiterId, (code: string) => {
        clearTimeout(timeout);
        this.codeWaiters.delete(waiterId);
        resolve(code);
      });
    });
  }

  private createSMTPServer(): Promise<SMTPServer> {
    return new Promise((resolve) => {
      const server = new SMTPServer({
        // disable STARTTLS to allow authentication in clear text mode
        disabledCommands: ["STARTTLS", "AUTH"],
        allowInsecureAuth: true,
        hideSTARTTLS: true,
        onData: (stream, session, callback) => {
          let emailData = "";
          stream.on("data", (chunk) => emailData += chunk);
          stream.on("end", () => {
            const $ = cheerio.load(emailData);
            const codeEl = $("code").first();
            const code = codeEl.length ? codeEl.text() : undefined;

            const email: Email = {
              to: session.envelope.rcptTo,
              from: session.envelope.mailFrom,
              body: emailData,
              verificationCode: code,
              timestamp: new Date(),
            };

            this.mailbox.push(email);

            if (code) {
              consola.info(`Verification code arrived: ${code}`);
              // Notify all waiting promises
              this.codeWaiters.forEach((resolve) => resolve(code));
              this.codeWaiters.clear();
            } else {
              consola.info("No <code> found in email.");
            }
          });

          callback();
        },
      });

      server.listen(SMTP_PORT, () => {
        consola.info(`SMTP server listening on port ${SMTP_PORT}`);
        resolve(server);
      });
    });
  }

  private static async setupMockPDS(plcUrl: string) {
    const sourcePds = await TestPds.create({
      didPlcUrl: plcUrl,
      port: PDS_A_PORT,
      inviteRequired: false,
      devMode: true,
      emailSmtpUrl: `smtp://localhost:${SMTP_PORT}`,
      emailFromAddress: `noreply@localhost:${SMTP_PORT}`,
    });

    const targetPds = await TestPds.create({
      didPlcUrl: plcUrl,
      port: PDS_B_PORT,
      inviteRequired: false,
      acceptingImports: true,
      devMode: true,
      emailSmtpUrl: `smtp://localhost:${SMTP_PORT}`,
      emailFromAddress: `noreply@localhost:${SMTP_PORT}`,
    });

    return {
      sourcePds,
      targetPds,
    };
  }

  async cleanup() {
    try {
      await this.sourcePds.close();
      await this.targetPds.close();
      await this.plc.close();
      await new Promise<void>((resolve) => {
        this.smtp.close(resolve);
      });
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}
