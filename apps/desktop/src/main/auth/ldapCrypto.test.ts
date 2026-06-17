import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import { encryptLdapPassword } from "./ldapCrypto";

async function createKeyPair(): Promise<{
  privateKey: CryptoKey;
  publicKeyPem: string;
}> {
  const keyPair = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
  const publicKeyDer = await webcrypto.subtle.exportKey("spki", keyPair.publicKey);
  const base64 = Buffer.from(publicKeyDer).toString("base64");
  const lines = base64.match(/.{1,64}/g) ?? [];

  return {
    privateKey: keyPair.privateKey,
    publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`
  };
}

describe("ldap crypto", () => {
  it("encrypts an LDAP password with RSA-OAEP SHA-256 public key metadata", async () => {
    const password = "P@ssw0rd!";
    const { privateKey, publicKeyPem } = await createKeyPair();
    const randomBytes = Buffer.from("0123456789abcdef0123456789abcdef", "utf8");

    const result = await encryptLdapPassword({
      password,
      publicKeyPem,
      keyId: "key-1",
      now: () => new Date("2026-06-17T09:00:00.000Z"),
      randomBytes: (size) => {
        expect(size).toBe(32);
        return randomBytes;
      }
    });

    expect(result.keyId).toBe("key-1");
    expect(result.timestamp).toBe("2026-06-17T09:00:00.000Z");
    expect(result.nonce).toBe(randomBytes.toString("base64url"));
    expect(result.passwordCipher.length).toBeGreaterThan(200);
    expect(result.passwordCipher).not.toContain(password);

    const decrypted = await webcrypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      Buffer.from(result.passwordCipher, "base64")
    );
    expect(JSON.parse(new TextDecoder().decode(decrypted))).toEqual({
      password,
      nonce: result.nonce,
      timestamp: result.timestamp
    });
  });

  it("rejects invalid public key PEM", async () => {
    await expect(
      encryptLdapPassword({
        password: "P@ssw0rd!",
        publicKeyPem: "not-a-public-key",
        keyId: "key-1",
        now: () => new Date("2026-06-17T09:00:00.000Z"),
        randomBytes: () => Buffer.alloc(32)
      })
    ).rejects.toBeDefined();
  });
});
