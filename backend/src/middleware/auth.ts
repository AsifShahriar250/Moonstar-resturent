import type { RequestHandler } from "express";
import { jwtVerify } from "jose";
import { prisma } from "../lib/prisma.js";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return new TextEncoder().encode(secret);
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  let userId: string;
  let tokenVersion: number;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: "moonstar-api",
      audience: "moonstar-admin",
    });

    if (typeof payload.sub !== "string") {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    if (
      typeof payload.ver !== "number" ||
      !Number.isInteger(payload.ver) ||
      payload.ver < 0
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    userId = payload.sub;
    tokenVersion = payload.ver;
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account is unavailable.",
      });
      return;
    }

    if (user.tokenVersion !== tokenVersion) {
      res.status(401).json({
        success: false,
        message: "Session has been revoked. Please log in again.",
      });
      return;
    }

    res.locals.authUser = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin: RequestHandler = (_req, res, next) => {
  const user = res.locals.authUser as
    | { id: string; role: "ADMIN" | "STAFF" }
    | undefined;

  if (!user || user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Administrator permission required.",
    });
    return;
  }

  next();
};
