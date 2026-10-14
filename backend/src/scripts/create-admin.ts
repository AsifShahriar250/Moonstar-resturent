import "dotenv/config";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma.js";

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askPassword(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Run this script directly in an interactive terminal."));
      return;
    }

    stdout.write(question);
    let password = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
    };

    const onData = (chunk: Buffer) => {
      for (const byte of chunk) {
        if (byte === 3) {
          cleanup();
          stdout.write("\n");
          reject(new Error("Password entry cancelled."));
          return;
        }

        if (byte === 13 || byte === 10) {
          cleanup();
          stdout.write("\n");
          resolve(password);
          return;
        }

        if (byte === 127 || byte === 8) {
          password = password.slice(0, -1);
          continue;
        }

        if (byte >= 32 && byte <= 126) {
          password += String.fromCharCode(byte);
          stdout.write("*");
        }
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short in .env.");
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (existingAdmin) {
    throw new Error("An ADMIN account already exists. Refusing to create another.");
  }

  const name = await ask("Admin name: ");
  const email = (await ask("Admin email: ")).toLowerCase();
  const password = await askPassword("Admin password (minimum 12 characters): ");

  if (name.length < 2 || name.length > 120) {
    throw new Error("Name must contain 2–120 characters.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new Error("Please enter a valid email address.");
  }

  if (password.length < 12 || password.length > 200) {
    throw new Error("Password must contain 12–200 characters.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("That email already exists. Choose a different email.");
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("\nAdmin account created successfully:");
  console.log(user);
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Failed to create admin account.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
