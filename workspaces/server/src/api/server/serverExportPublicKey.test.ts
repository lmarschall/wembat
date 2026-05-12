import { Request, Response } from "express";
// Sauberer ESM-Import (Passe den Pfad an, falls er in einem anderen Unterordner liegt)
import { serverExportPublicKey } from "#api/server/serverExportPublicKey";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN UND DES STATES ---
// Wir packen unseren dynamischen State in ein Objekt, damit wir ihn später mutieren können
const { mockState } = vi.hoisted(() => {
  return {
    mockState: {
      exportPublicKey: vi.fn(),
      cryptoService: undefined as any, // Wird im beforeEach definiert
    },
  };
});

// --- 2. REGISTRIERUNG DES MOCKS ---
// Nutzt jetzt sauber deinen #crypto Alias
vi.mock("#crypto", () => ({
  // Der Getter liest immer den aktuellen Wert aus unserem mockState-Objekt aus
  get cryptoService() {
    return mockState.cryptoService;
  },
}));

// --- 3. TEST SUITE ---
describe("testServerExportPublicKey", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    };
    
    // Reset the mock module state and clear function histories before EVERY test
    mockState.cryptoService = {
      exportPublicKey: mockState.exportPublicKey,
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
  });

  it("should return 500 if cryptoService is not initialized", async () => {
    // Simulate cryptoService not being initialized
    mockState.cryptoService = undefined;

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("CryptoService not initialized");
  });

  it("should return 500 when exportPublicKey fails", async () => {
    mockState.exportPublicKey.mockRejectedValue(new Error("Export error"));

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Export error");
  });

  it("should return 200 and the public key if successful", async () => {
    mockState.exportPublicKey.mockResolvedValue("mockedPublicKey");

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("mockedPublicKey");
  });
});