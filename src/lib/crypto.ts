import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

import { appConfig } from "./config";

const key = Buffer.from(appConfig.encryptionKey, "base64");

if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a base64 encoded 32 byte key");
}

export const encryptValue = (value: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    value: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
};

export const decryptValue = (encrypted: string, ivBase64: string) => {
  const buffer = Buffer.from(encrypted, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  const tag = buffer.subarray(buffer.length - 16);
  const ciphertext = buffer.subarray(0, buffer.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
};
