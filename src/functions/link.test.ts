//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/link.test.ts

import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { link } from "./link";
import {
	browserSupportsWebAuthn,
	startRegistration,
} from "@simplewebauthn/browser";
import type { AxiosInstance } from "axios";

// Mock the webauthn browser helpers
vi.mock("@simplewebauthn/browser", () => ({
	browserSupportsWebAuthn: vi.fn(),
	startRegistration: vi.fn(),
}));

describe("link", () => {
	let mockAxiosClient: Partial<AxiosInstance>;
	const requestLinkResponseData = {
		options: { challenge: "testChallenge" },
	};
	const validRegistrationResponse = {
		clientExtensionResults: { prf: { enabled: true } },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockAxiosClient = {
			post: vi.fn(),
		};
		// Default: browser supports WebAuthn
		(browserSupportsWebAuthn as Mock).mockReturnValue(true);
		(startRegistration as Mock).mockResolvedValue(validRegistrationResponse);
	});

	it("should return error if WebAuthn is not supported", async () => {
		(browserSupportsWebAuthn as Mock).mockReturnValue(false);
		const result = await link(mockAxiosClient as AxiosInstance);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe(
			"WebAuthn is not supported on this browser!"
		);
	});

	it("should throw error if /request-link returns non-200", async () => {
		(mockAxiosClient.post as Mock).mockResolvedValueOnce({
			status: 400,
			data: "Error from request-link",
		});
		const result = await link(mockAxiosClient as AxiosInstance);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Error from request-link");
	});

	it("should throw error if startRegistration fails", async () => {
		(mockAxiosClient.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify(requestLinkResponseData),
		});
		(startRegistration as Mock).mockRejectedValueOnce(
			new Error("startRegistration error")
		);
		const result = await link(mockAxiosClient as AxiosInstance);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Error: startRegistration error");
	});

	it("should throw error if PRF extension is disabled", async () => {
		(mockAxiosClient.post as Mock).mockResolvedValueOnce({
			status: 200,
			data: JSON.stringify(requestLinkResponseData),
		});
		(startRegistration as Mock).mockResolvedValueOnce({
			clientExtensionResults: { prf: { enabled: false } },
		});
		const result = await link(mockAxiosClient as AxiosInstance);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("PRF extension disabled");
	});

	it("should throw error if /link returns non-200", async () => {
		(mockAxiosClient.post as Mock)
			// First call: /request-link returns 200 and valid options
			.mockResolvedValueOnce({
				status: 200,
				data: JSON.stringify(requestLinkResponseData),
			})
			// Second call: /link returns non-200
			.mockResolvedValueOnce({
				status: 400,
				data: "Error from link",
			});
		const result = await link(mockAxiosClient as AxiosInstance);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Error from link");
	});

	it("should return success if linking succeeds", async () => {
		const registerResponse = { verified: true };
		(mockAxiosClient.post as Mock)
			// First call: /request-link returns valid options
			.mockResolvedValueOnce({
				status: 200,
				data: JSON.stringify(requestLinkResponseData),
			})
			// Second call: /link returns 200 and register response
			.mockResolvedValueOnce({
				status: 200,
				data: JSON.stringify(registerResponse),
			});
		const result = await link(mockAxiosClient as AxiosInstance);
		expect(result.success).toBe(true);
		expect(result.result.verified).toBe(true);
	});
});
