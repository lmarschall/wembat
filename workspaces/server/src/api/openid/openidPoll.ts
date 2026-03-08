import { Request, Response } from "express";
import { authStore } from "#api/auth-store";

export async function openidPoll(req: Request, res: Response): Promise<void> {
    try {
        const requestId = req.query.requestId as string;

        if (!requestId) throw new Error('Missing requestId');

        const state = authStore.get(requestId);

        // Case 1: ID not found (Expired or never started)
        if (!state) throw new Error('Session not found or expired');

        // Case 2: Still waiting for user to login
        if (state.status === 'pending') {
            res.json({ status: 'pending' });
        }

        // Case 3: Success!
        if (state.status === 'success') {
            // CRITICAL: Delete the data immediately so it can't be fetched again (Replay Protection)
            authStore.delete(requestId);
        }
        
        res.json({
            status: 'success',
            user: state.user,
            token: state.token // Your JWT or Session ID
        });

        // Case 4: Error during login
        if (state.status === 'error') {
            authStore.delete(requestId);
            res.json({ status: 'error', message: state.error });
        }
    } catch (error: any) {
        console.log(error);
		res.status(400).send(error.message);
    }
}