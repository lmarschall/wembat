export class Store {
    private privateKey: Uint8Array | undefined;
    private publicKey: Uint8Array | undefined;
    private token: string | undefined;

    public setKeys(privateKey: Uint8Array, publicKey: Uint8Array) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    public setToken(token: string) {
        this.token = token;
    }

    public getPrivateKey() {
        return this.privateKey;
    }

    public getPublicKey() {
        return this.publicKey;
    }

    public getToken() {
        return this.token;
    }
}