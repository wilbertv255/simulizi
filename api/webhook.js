import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyDfYDVYx10P9FUUNTlXw3dfTjPNNlR-Rhc",
    authDomain: "simulizi23.firebaseapp.com",
    databaseURL: "https://simulizi23-default-rtdb.firebaseio.com",
    projectId: "simulizi23",
    storageBucket: "simulizi23.firebasestorage.app",
    messagingSenderId: "306995992624",
    appId: "1:306995992624:web:169d1fa3e2866d771e35f5",
    measurementId: "G-7RLGM76PSE"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default async function handler(req, res) {
    console.log('=== Webhook Invoked ===');
    console.log('Request Method:', req.method);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        console.log('Method Not Allowed:', req.method);
        return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
    }

    let body;
    try {
        console.log('Parsing Webhook Body');
        body = req.body;
        console.log('Parsed Webhook Body:', body);
    } catch (error) {
        console.error('Webhook JSON Parse Error:', error.message);
        return res.status(400).json({ status: 'error', message: 'Invalid JSON body', error: error.message });
    }

    const { order_id } = body;
    const rawStatus = body.payment_status || body.status;  // Handle possible field names from ZenoPay
    const transaction_id = body.transaction_id || body.reference;

    if (!order_id || !rawStatus) {
        console.log('Missing Webhook Fields:', { order_id, rawStatus });
        return res.status(400).json({ status: 'error', message: 'Missing required webhook fields' });
    }

    try {
        console.log('Processing Webhook for Order:', order_id);

        // Map ZenoPay status to our DB status
        let dbStatus = 'pending';
        if (rawStatus.toUpperCase() === 'COMPLETED' || rawStatus.toUpperCase() === 'SUCCESS') {
            dbStatus = 'complete';
        } else if (rawStatus.toUpperCase() === 'FAILED' || rawStatus.toUpperCase() === 'CANCELLED') {
            dbStatus = 'cancelled';
        }

        // Get payment record using order_id as key
        const paymentRef = ref(database, `payments/${order_id}`);
        const paymentSnapshot = await get(paymentRef);

        if (!paymentSnapshot.exists()) {
            console.error('Payment record not found for order:', order_id);
            return res.status(404).json({ status: 'error', message: 'Payment record not found' });
        }

        // Update payment status
        await update(paymentRef, {
            status: dbStatus,
            transactionId: transaction_id || null,
            updatedAt: new Date().toISOString()
        });

        // If complete, update user premium and ended date
        if (dbStatus === 'complete') {
            const paymentData = paymentSnapshot.val();
            const userId = paymentData.userId;
            const plan = paymentData.plan;
            let days = 30;  // Only one plan: Bronze with 30 days

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            const userRef = ref(database, `users/${userId}`);
            await update(userRef, {
                premium: 1,
                ended: endDate.toISOString()
            });

            console.log(`User ${userId} updated to premium with end date: ${endDate.toISOString()}`);
        }

        console.log(`Webhook Processed: Order ${order_id} updated to status ${dbStatus}`);
        return res.status(200).json({ status: 'success', message: 'Webhook processed' });
    } catch (error) {
        console.error('Webhook Processing Error:', error.message);
        return res.status(500).json({ status: 'error', message: `Failed to process webhook: ${error.message}` });
    }
}