export class Store {
    private privateKey: CryptoKey | undefined;
    private publicKey: CryptoKey | undefined;
    private token: string | undefined;
    private userMail: string | undefined;

    public setKeys(privateKey: CryptoKey, publicKey: CryptoKey) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    public setToken(token: string) {
        this.token = token;
    }

    public setUserMail(userMail: string) {
        this.userMail = userMail;
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

    public getUserMail() {
        return this.userMail;
    }
}