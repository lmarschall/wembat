import { Request, Response } from "express";

// --- 1. CRYPTO SERVICE MOCK ---
const mockExportPublicKey = jest.fn();

// We use a variable here so we can simulate the service being undefined later
let mockCryptoModuleState: any = {
  exportPublicKey: mockExportPublicKey,
};

jest.mock("../../crypto", () => ({
  // Using a getter ensures the controller always reads the *current* state of our variable
  get cryptoService() {
    return mockCryptoModuleState;
  },
}));

// --- 2. DYNAMIC IMPORT OF CONTROLLER ---
// Load controller AFTER the mocks are registered to prevent import hoisting bugs
const { serverExportPublicKey } = require("./serverExportPublicKey");

describe("testServerExportPublicKey", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    
    // Reset the mock module state and clear function histories before EVERY test
    mockCryptoModuleState = {
      exportPublicKey: mockExportPublicKey,
    };
    jest.clearAllMocks();
  });

  it("should return 500 if cryptoService is not initialized", async () => {
    // Simulate cryptoService not being initialized
    mockCryptoModuleState = undefined;

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("CryptoService not initialized");
  });

  it("should return 500 when exportPublicKey fails", async () => {
    mockExportPublicKey.mockRejectedValue(new Error("Export error"));

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Export error");
  });

  it("should return 200 and the public key if successful", async () => {
    mockExportPublicKey.mockResolvedValue("mockedPublicKey");

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("mockedPublicKey");
  });
});