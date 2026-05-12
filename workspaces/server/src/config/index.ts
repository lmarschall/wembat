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
    private readonly redisUrl: string;
    private readonly dashboardUrl: string;
    private readonly databaseUrl: string;

    constructor() {
        const serverHost = process.env.SERVER_HOST || "http://localhost";
        const serverPort = process.env.SERVER_PORT || 8080;
        this.serverUrl = `${serverHost}:${serverPort}`;
        const redisPort = process.env.REDIS_PORT || 6379;
        const redisHost = process.env.REDIS_HOST || "127.0.0.1";
        this.redisUrl = `redis://${redisHost}:${redisPort}`;
        const dashboardHost = process.env.DASHBOARD_HOST || "http://localhost";
        const dashboardPort = process.env.DASHBOARD_PORT || 9090;
        this.dashboardUrl = `${dashboardHost}:${dashboardPort}`;
        const databaseUser = process.env.DATABASE_USER || "postgresUser";
        const databasePassword = process.env.DATABASE_PASSWORD || "postgresPassword";
        const databaseDB = process.env.DATABASE_DB || "postgresDatabase";
        const databaseHost = process.env.DATABASE_HOST || "localhost";
        const databasePort = 5432;
        this.databaseUrl = `postgresql://${databaseUser}:${databasePassword}@${databaseHost}:${databasePort}/${databaseDB}?connect_timeout=300`;
    }

    getServerUrl() {
        return this.serverUrl;
    }

    getRedisUrl() {
        return this.redisUrl;
    }
    
    getDashboardUrl() {
        return this.dashboardUrl;
    }

    getDatabaseUrl() {
        return this.databaseUrl;
    }
}