//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/register.test.ts

import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { register } from "./register";
import {
	browserSupportsWebAuthn,
	startRegistration,
} from "@simplewebauthn/browser";
import type { AxiosInstance } from "axios";

// Browser-Funktionalitäten mocken
vi.mock("@simplewebauthn/browser", () => ({
	browserSupportsWebAuthn: vi.fn(),
	startRegistration: vi.fn(),
}));

describe("register", () => {
	let mockAxios: Partial<AxiosInstance>;

	beforeEach(() => {
		vi.clearAllMocks();
		(browserSupportsWebAuthn as Mock).mockReturnValue(true);

		mockAxios = {
			post: vi.fn() as Mock,
		};
	});

	it("sollte Fehler werfen, wenn WebAuthn nicht unterstützt wird", async () => {
		(browserSupportsWebAuthn as Mock).mockReturnValue(false);

		const result = await register(mockAxios as any, "test@user.com");

		expect(result.success).toBe(false);
		expect(result.error.error).toBe(
			"WebAuthn is not supported on this browser!"
		);
	});

	it("sollte Fehler werfen, wenn /request-register nicht Status 200 liefert", async () => {
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 400,
			data: "Bad request",
		});

		const result = await register(mockAxios as any, "test@user.com");

		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Bad request");
	});

	it("sollte Fehler werfen, wenn startRegistration fehlschlägt", async () => {
		(mockAxios.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify({
				options: {
					challenge: "testChallenge",
				},
			}),
		});
		(startRegistration as Mock).mockRejectedValue(
			new Error("Registration failed")
		);

		const result = await register(mockAxios as any, "test@user.com");
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Registration failed");
	});

	it("sollte Fehler werfen, wenn /register nicht Status 200 liefert", async () => {
		(mockAxios.post as Mock)
			// /request-register
			.mockResolvedValueOnce({
				status: 200,
				data: JSON.stringify({
					options: { challenge: "testChallenge" },
				}),
			})
			// /register
			.mockResolvedValueOnce({
				status: 400,
				data: "Register endpoint error",
			});

		(startRegistration as Mock).mockResolvedValue({
			clientExtensionResults: {},
			id: "credentialId",
			rawId: "rawId",
			response: {},
			type: "public-key",
		});

		const result = await register(mockAxios as any, "test@user.com");

		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Register endpoint error");
	});

	it("sollte success=true zurückgeben, wenn alles korrekt verläuft", async () => {
		(mockAxios.post as Mock)
			// /request-register
			.mockResolvedValueOnce({
				status: 200,
				data: JSON.stringify({
					options: { challenge: "testChallenge" },
				}),
			})
			// /register
			.mockResolvedValueOnce({
				status: 200,
				data: JSON.stringify({
					verified: true,
				}),
			});

		(startRegistration as Mock).mockResolvedValue({
			clientExtensionResults: {},
			id: "credentialId",
			rawId: "rawId",
			response: {},
			type: "public-key",
		});

		const result = await register(mockAxios as any, "test@user.com");

		expect(result.success).toBe(true);
		expect(result.result.verified).toBe(true);
	});
});
