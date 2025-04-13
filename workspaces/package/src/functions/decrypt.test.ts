//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/decrypt.test.ts

import { describe, it, expect, beforeAll, vi, Mock } from "vitest";
import { decrypt } from "./decrypt";
import { deriveEncryptionKey, str2ab } from "./helper";
import { WembatMessage, WembatActionResponse } from "../types";

// window.crypto in Node-Umgebung mocken
beforeAll(() => {
	Object.defineProperty(globalThis, "window", {
		value: {
			crypto: {
				subtle: {
					decrypt: vi.fn(),
				},
			},
		},
	});
});

// Hilfsfunktionen mocken
vi.mock("./helper", () => ({
	deriveEncryptionKey: vi.fn(),
	str2ab: vi.fn(),
}));

describe("decrypt", () => {
	it("wirft Fehler, wenn privateKey nicht vorhanden ist", async () => {
		const result = await decrypt(
			undefined,
			{} as WembatMessage,
			{} as CryptoKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Private Key undefined!");
	});

	it("gibt entschlüsseltes Objekt zurück, wenn alles korrekt ist", async () => {
		// Mocks
		(deriveEncryptionKey as Mock).mockResolvedValue("mockEncryptionKey");
		(str2ab as Mock).mockReturnValue(new ArrayBuffer(8));
		(globalThis.window.crypto.subtle.decrypt as Mock).mockResolvedValue(
			new TextEncoder().encode("Decrypted Message")
		);

		const mockPrivateKey = {} as CryptoKey;
		const mockPublicKey = {} as CryptoKey;
		const mockMsg: WembatMessage = {
			message: "",
			encrypted: "MockEncryptedData",
			iv: "MockIv",
		};

		const result = await decrypt(mockPrivateKey, mockMsg, mockPublicKey);
		expect(deriveEncryptionKey).toHaveBeenCalledWith(
			mockPrivateKey,
			mockPublicKey
		);
		expect(result.success).toBe(true);
		expect(result.result.message).toBe("Decrypted Message");
		expect(result.result.iv).toBe("MockIv");
	});

	it("gibt Fehler zurück, wenn decrypt fehlschlägt", async () => {
		(deriveEncryptionKey as Mock).mockResolvedValue("mockEncryptionKey");
		(str2ab as Mock).mockReturnValue(new ArrayBuffer(8));
		(globalThis.window.crypto.subtle.decrypt as Mock).mockRejectedValue(
			new Error("Decrypt failed")
		);

		const mockKey = {} as CryptoKey;
		const mockMsg = { message: "", encrypted: "Encrypted", iv: "Iv" };

		const result = await decrypt(mockKey, mockMsg, mockKey);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Decrypt failed");
	});
});
