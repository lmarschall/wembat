//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/onboard.test.ts

import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { onboard } from "./onboard";
import {
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
} from "@simplewebauthn/browser";
import { ab2str, bufferToArrayBuffer, saveCryptoKeyAsString } from "./helper";
import { AxiosInstance } from "axios";

// Mock-Funktionen
vi.mock("@simplewebauthn/browser", () => ({
	browserSupportsWebAuthn: vi.fn(),
	browserSupportsWebAuthnAutofill: vi.fn(),
	startAuthentication: vi.fn(),
}));
vi.mock("./helper", () => ({
	ab2str: vi.fn(),
	bufferToArrayBuffer: vi.fn(),
	saveCryptoKeyAsString: vi.fn(),
}));

describe("onboard", () => {
	let mockAxios: Partial<AxiosInstance>;
	let mockPublicKey: CryptoKey;
	let mockPrivateKey: CryptoKey;

	beforeEach(() => {
		vi.clearAllMocks();
		mockAxios = {
			post: vi.fn() as Mock,
		};
		mockPublicKey = {} as CryptoKey;
		mockPrivateKey = {} as CryptoKey;

		(browserSupportsWebAuthn as Mock).mockReturnValue(true);
		(browserSupportsWebAuthnAutofill as Mock).mockResolvedValue(true);
	});

	it("sollte Fehler werfen, wenn Browser kein WebAuthn unterstützt", async () => {
		(browserSupportsWebAuthn as Mock).mockReturnValue(false);
		const result = await onboard(
			mockAxios as any,
			mockPublicKey,
			mockPrivateKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe(
			"WebAuthn is not supported on this browser!"
		);
	});

	it("sollte Fehler werfen, wenn axiosClient undefined ist", async () => {
		const result = await onboard(
			undefined as any,
			mockPublicKey,
			mockPrivateKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Axiso Client undefined!");
	});

	it("sollte Fehler werfen, wenn publicKey undefined ist", async () => {
		const result = await onboard(
			mockAxios as any,
			undefined as any,
			mockPrivateKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Public Key undefined!");
	});

	it("sollte Fehler werfen, wenn privateKey undefined ist", async () => {
		const result = await onboard(
			mockAxios as any,
			mockPublicKey,
			undefined as any
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Private Key undefined!");
	});

	it("sollte Fehler werfen, wenn /request-onboard nicht Status 200 liefert", async () => {
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 400,
			data: "Bad request",
		});
		const result = await onboard(
			mockAxios as any,
			mockPublicKey,
			mockPrivateKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Bad request");
	});

	it("sollte Fehler werfen, wenn startAuthentication fehlschlägt", async () => {
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify({
				options: {
					challenge: "testChallenge",
					extensions: { prf: { eval: { first: [99, 100] } } },
				},
			}),
		});
		(bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
		(startAuthentication as Mock).mockRejectedValue(new Error("Auth failed"));

		const result = await onboard(
			mockAxios as any,
			mockPublicKey,
			mockPrivateKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Error: Auth failed");
	});

	it("sollte Fehler werfen, wenn /onboard kein 200 zurückgibt", async () => {
		// request-onboard erfolgreich
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify({
				options: {
					challenge: "testChallenge",
					extensions: { prf: { eval: { first: [99, 100] } } },
				},
			}),
		});
		(bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
		(startAuthentication as Mock).mockResolvedValue({
			clientExtensionResults: { prf: { results: { first: [99, 100] } } },
		});
		// onboard-Request schlägt fehl
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 400,
			data: "Onboard error",
		});

		const result = await onboard(
			mockAxios as any,
			mockPublicKey,
			mockPrivateKey
		);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Onboard error");
	});

	it("sollte success=true zurückgeben, wenn alles korrekt abläuft", async () => {
		// 1. request-onboard
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify({
				options: {
					challenge: "testChallenge",
					extensions: { prf: { eval: { first: [99, 100] } } },
				},
			}),
		});
		(bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
		(startAuthentication as Mock).mockResolvedValue({
			clientExtensionResults: { prf: { results: { first: [99, 100] } } },
		});
		// /onboard
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify({ success: true }),
		});
		(saveCryptoKeyAsString as Mock).mockResolvedValue("keyString");
		// Rufe Funktion auf
		const result = await onboard(
			mockAxios as any,
			mockPublicKey,
			mockPrivateKey
		);

		expect(result.success).toBe(true);
		expect(result.result.verified).toBe(true);
	});
});
