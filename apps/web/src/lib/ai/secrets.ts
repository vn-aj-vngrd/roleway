import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey() {
  const encoded = process.env.AI_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("AI credential encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("AI credential encryption key must be 32 bytes.");
  return key;
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted: Buffer.concat([encrypted, tag]).toString("base64"), iv: iv.toString("base64") };
}

export function decryptSecret(encrypted: string, encodedIv: string) {
  const payload = Buffer.from(encrypted, "base64");
  const content = payload.subarray(0, -16);
  const tag = payload.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(content), decipher.final()]).toString("utf8");
}
