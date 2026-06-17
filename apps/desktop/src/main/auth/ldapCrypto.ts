import { randomBytes as nodeRandomBytes, webcrypto } from "node:crypto";

export interface EncryptedLdapPassword {
  keyId: string;
  passwordCipher: string;
  nonce: string;
  timestamp: string;
}

interface EncryptLdapPasswordOptions {
  password: string;
  publicKeyPem: string;
  keyId: string;
  now?: () => Date;
  randomBytes?: (size: number) => Buffer;
}

export async function encryptLdapPassword(
  options: EncryptLdapPasswordOptions
): Promise<EncryptedLdapPassword> {
  const now = options.now ?? (() => new Date());
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const nonce = randomBytes(32).toString("base64url");
  const timestamp = now().toISOString();
  const payload = JSON.stringify({
    password: options.password,
    nonce,
    timestamp
  });
  const publicKey = await importRsaOaepPublicKey(options.publicKeyPem);
  const cipher = await webcrypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(payload)
  );

  return {
    keyId: options.keyId,
    passwordCipher: Buffer.from(cipher).toString("base64"),
    nonce,
    timestamp
  };
}

async function importRsaOaepPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  const publicKeyDer = Buffer.from(
    publicKeyPem
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s/g, ""),
    "base64"
  );

  return webcrypto.subtle.importKey(
    "spki",
    new Uint8Array(publicKeyDer),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );
}
