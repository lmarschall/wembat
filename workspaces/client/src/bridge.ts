// Bridge.ts

type MessageData = {
    id: string;
    type: 'REQUEST' | 'RESPONSE';
    method?: string;
    payload?: any;
    error?: string;
};

// Helper type for handlers that want to return data + transferables
export type TransferableResponse<T> = {
    payload: T;
    transfer: Transferable[];
};

interface Endpoint {
    postMessage(message: any, transfer?: Transferable[]): void;
    addEventListener(type: string, listener: (e: MessageEvent) => any): void;
    removeEventListener(type: string, listener: (e: MessageEvent) => any): void;
}

export class Bridge {
    private handlers = new Map<string, Function>();
    private pending = new Map<string, { resolve: Function; reject: Function }>();

    constructor(private target: Endpoint) {
        this.target.addEventListener('message', (e) => this.handle(e));
    }

    public on(method: string, handler: (payload: any) => Promise<any> | any) {
        this.handlers.set(method, handler);
    }

    /**
     * @param transfer - Optional array of ArrayBuffers to transfer ownership (Zero-Copy)
     */
    public invoke<T>(method: string, payload?: any, transfer: Transferable[] = []): Promise<T> {
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            
            // We pass the transfer array as the second argument to postMessage
            this.target.postMessage(
                { id, type: 'REQUEST', method, payload }, 
                transfer
            );
        });
    }

    private async handle(event: MessageEvent) {
        const data: MessageData = event.data;
        if (!data || !data.id) return;

        if (data.type === 'REQUEST' && data.method) {
            const handler = this.handlers.get(data.method);
            try {
                if (!handler) throw new Error(`No handler for: ${data.method}`);
                
                const result = await handler(data.payload);
                
                // Check if the handler returned a TransferableResponse structure
                // We check if it looks like { payload: ..., transfer: [...] }
                const isTransferableResponse = result && typeof result === 'object' && Array.isArray(result.transfer);

                const responsePayload = isTransferableResponse ? result.payload : result;
                const responseTransfer = isTransferableResponse ? result.transfer : [];

                this.target.postMessage({
                    id: data.id,
                    type: 'RESPONSE',
                    payload: responsePayload
                }, responseTransfer); // <--- Transfer back to caller

            } catch (err: any) {
                this.target.postMessage({
                    id: data.id,
                    type: 'RESPONSE',
                    error: err.message
                });
            }
        }
        else if (data.type === 'RESPONSE') {
            const promise = this.pending.get(data.id);
            if (promise) {
                data.error ? promise.reject(new Error(data.error)) : promise.resolve(data.payload);
                this.pending.delete(data.id);
            }
        }
    }
}