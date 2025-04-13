
import { Request, Response } from "express";
import { cryptoService, initCryptoTest } from "../../crypto";
import { validateWebAuthnToken } from "./validateWebAuthn";
import { generateKeyPair } from "jose";

describe("validateWebAuthnToken", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: jest.Mock;

	beforeEach(async () => {
		await initCryptoTest();

		req = {
			headers: {},
		};
		res = {
			locals: {},
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
		};
		next = jest.fn();
	});

	it("should return 401 if no Authorization header is present", async () => {
		await validateWebAuthnToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("No Authorization header");
	});

	it("should return 401 if Authorization header is invalid", async () => {
		req.headers = req.headers || {};
		req.headers.authorization = "Invalid header";
		await validateWebAuthnToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("Invalid Authorization header");
	});

	// it("should return 401 if algorithm is invalid", async () => {
	// 	await initCryptoTest("ES384");
	// 	const jwt = await cryptoService.createJWT(
	// 		{ admin: true },
	// 		"ES256",
	// 		"",
	// 		""
	// 	);
	// 	req.headers = req.headers || {};
	// 	req.headers.authorization = "Bearer " + jwt;
	// 	await validateAdminToken(req as Request, res as Response, next);
	// 	expect(res.status).toHaveBeenCalledWith(401);
	// 	expect(res.send).toHaveBeenCalledWith("Invalid algorithm");
	// });

	it("should return 401 if public key is invalid", async () => {
		const jwt = await cryptoService.createJWT(
			{ sessionId: "session.uid", userMail: "user.mail" },
			"ES256",
			"",
			""
		);
		req.headers = req.headers || {};
		req.headers.authorization = "Bearer " + jwt;
		let newKeyPair = await generateKeyPair("ES256");
		cryptoService.setPublicKey(newKeyPair.publicKey);
		await validateWebAuthnToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("Invalid public key");
	});

	it("should call next if token is valid", async () => {
		const jwt = await cryptoService.createJWT(
			{ sessionId: "session.uid", userMail: "user.mail" },
			"ES256",
			"",
			""
		);
		req.headers = req.headers || {};
		res.locals = res.locals || {};
		req.headers.authorization = "Bearer " + jwt;
		await validateWebAuthnToken(req as Request, res as Response, next);
		expect(res.locals.payload.sessionId).toBe("session.uid");
		expect(res.locals.payload.userMail).toBe("user.mail");
		expect(next).toHaveBeenCalled();
	});
});

// jest.mock("jose", () => ({
// 	// ...existing code...
// 	decodeProtectedHeader: jest.fn(),
// 	importJWK: jest.fn(),
// 	jwtVerify: jest.fn(),
// }));

// jest.mock('jose', () => ({
// 	...jest.requireActual('jose'),  // Keep other implementations intact
// 	decodeProtectedHeader: jest.fn(),  // Mock this function
// 	importJWK: jest.fn(),
// 	jwtVerify: jest.fn(),
//   }));

//   import decodeProtectedHeader from 'jose'; // Default import

// jest.mock('jose', () => ({
// 	__esModule: true,
// 	default: jest.fn(), // Mock the default export
// }));
  
// (jose.decodeProtectedHeader as jest.Mock).mockReturnValue({ alg: "invalid" });
