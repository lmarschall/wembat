import axios from "axios";
import { useTokenStore } from "@/stores/token";

export interface Application {
    uid: String
    name: String
    domain: String
    publicKey: String
    privateKey: String
}

export interface ApplicationPostData {
    applicationInfo: ApplicationInfo
}

export interface ApplicationInfo {
    appUId: String
    appName: String,
    appDomain: String
}

export class WembatRequestService {
    private baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
    private readonly tokenStore;

    constructor() {
        this.tokenStore = useTokenStore();
    }

    public async applicationUpdate(data: any): Promise<boolean> {
        try {
            await axios.post(`${this.baseUrl}/admin/application/update`, data, {
                headers: {
                    Authorization: `Bearer ${this.tokenStore.token}`,
                },
            });
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    public async applicationList(): Promise<Application[]> {
        try {
            let listRequest = await axios.get(`${this.baseUrl}/admin/application/list`, {
                headers: {
                    Authorization: `Bearer ${this.tokenStore.token}`,
                },
            });
            return listRequest.data;
        } catch (error) {
            console.log(error);
            return [];
        }
    }

    public async applicationCreate(data: any): Promise<boolean> {
        try {
            await axios.post(`${this.baseUrl}/admin/application/create`, data, {
                headers: {
                    Authorization: `Bearer ${this.tokenStore.token}`,
                },
            });
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    public async applicationDelete(data: any): Promise<boolean> {
        try {
            await axios.post(`${this.baseUrl}/admin/application/delete`, data, {
                headers: {
                    Authorization: `Bearer ${this.tokenStore.token}`,
                },
            });
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    public async applicationToken(data: any): Promise<string> {
        try {
            let tokenRequest = await axios.post(`${this.baseUrl}/admin/application/token`, data, {
                headers: {
                    Authorization: `Bearer ${this.tokenStore.token}`,
                },
            });
            return tokenRequest.data;
        } catch (error) {
            console.log(error);
            return "";
        }
    }
}