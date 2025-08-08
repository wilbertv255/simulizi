import { initializeApp } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';

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

    const { order_id, status, transaction_id } = body;

    if (!order_id || !status) {
        console.log('Missing Webhook Fields:', { order_id, status });
        return res.status(400).json({ status: 'error', message: 'Missing required webhook fields' });
    }

    try {
        console.log('Updating Firebase for Order:', order_id);
        const paymentRef = ref(database, `payments/${order_id}`);
        await update(paymentRef, {
            status,
            transactionId: transaction_id || null,
            updatedAt: new Date().toISOString()
        });

        console.log(`Webhook Processed: Order ${order_id} updated to status ${status}`);
        return res.status(200).json({ status: 'success', message: 'Webhook processed' });
    } catch (error) {
        console.error('Webhook Processing Error:', error.message);
        return res.status(500).json({ status: 'error', message: `Failed to process webhook: ${error.message}` });
    }
}