import { validateAdminToken } from "./validateAdmin";
import { Request, Response } from "express";
import { publicKeyJwk } from "../../crypto";
// import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";

import * as jose from "jose";

jest.mock("jose", () => ({
	// ...existing code...
	decodeProtectedHeader: jest.fn(),
	importJWK: jest.fn(),
	jwtVerify: jest.fn(),
}));

jest.mock("jose");

describe("validateAdminToken", () => {
	let req: Partial<Request>;
	let res: Partial<Response>;
	let next: jest.Mock;

	beforeEach(() => {
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
		await validateAdminToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("No Authorization header");
	});

	it("should return 401 if Authorization header is invalid", async () => {
		req.headers = req.headers || {};
		req.headers.authorization = "Invalid header";
		await validateAdminToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("Invalid Authorization header");
	});

	it("should return 401 if algorithm is invalid", async () => {
		req.headers = req.headers || {};
		req.headers.authorization = "Bearer token";
		(jose.decodeProtectedHeader as jest.Mock).mockReturnValue({ alg: "invalid" });
		await validateAdminToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("Invalid algorithm");
	});

	it("should return 401 if public key is invalid", async () => {
		req.headers = req.headers || {};
		req.headers.authorization = "Bearer token";
		(jose.decodeProtectedHeader as jest.Mock).mockReturnValue({ alg: "ES256", jwk: "invalid" });
		await validateAdminToken(req as Request, res as Response, next);
		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("Invalid public key");
	});

	it("should call next if token is valid", async () => {
		req.headers = req.headers || {};
		res.locals = res.locals || {};
		req.headers.authorization = "Bearer token";
		(jose.decodeProtectedHeader as jest.Mock).mockReturnValue({ alg: "ES256", jwk: publicKeyJwk });
		(jose.importJWK as jest.Mock).mockResolvedValue("importedKey");
		(jose.jwtVerify as jest.Mock).mockResolvedValue({ payload: "payload", protectedHeader: "header" });

		await validateAdminToken(req as Request, res as Response, next);
		expect(res.locals.payload).toBe("payload");
		expect(next).toHaveBeenCalled();
	});
});
