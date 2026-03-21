import dotenv from 'dotenv';
dotenv.config();

export let configService: ConfigService;

export async function initConfig(): Promise<boolean> {
    try {
        configService = new ConfigService();
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export class ConfigService {
    private readonly serverUrl: string;
    private readonly dashboardUrl: string;
    private readonly databaseUrl: string;

    constructor() {
        const serverHost = process.env.SERVER_HOST || "http://localhost";
        const serverPort = process.env.SERVER_PORT || 8080;
        this.serverUrl = serverHost + ":" + serverPort;
        const dashboardHost = process.env.DASHBOARD_HOST || "http://localhost";
        const dashboardPort = process.env.DASHBOARD_PORT || 9090;
        this.dashboardUrl = dashboardHost + ":" + dashboardPort;
        this.databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:5432";
    }

    getServerUrl() {
        return this.serverUrl;
    }
    
    getDashboardUrl() {
        return this.dashboardUrl;
    }

    getDatabaseUrl() {
        return this.databaseUrl;
    }
}