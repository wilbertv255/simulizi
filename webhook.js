const { initializeApp } = require('firebase/app');
const { getDatabase, ref, update, get } = require('firebase/database');

// Mpangilio wa Firebase
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

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

exports.handler = async function(event, context) {
    // Thibitisha kuwa ni POST request
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ status: 'error', message: 'Method Not Allowed' })
        };
    }

    const apiKey = event.headers['x-api-key'];
    if (apiKey !== 'YOUR_API_KEY') { // Weka API key yako hapa
        return {
            statusCode: 401,
            body: JSON.stringify({ status: 'error', message: 'Invalid API Key' })
        };
    }

    const body = JSON.parse(event.body || '{}');
    const { order_id, payment_status, reference } = body;

    if (payment_status !== 'COMPLETED') {
        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'success', message: 'Webhook received, but status is not COMPLETED' })
        };
    }

    try {
        // Pata rekodi ya malipo kwa order_id
        const paymentsRef = ref(database, 'paymentRecords');
        const snapshot = await get(paymentsRef);
        if (!snapshot.exists()) {
            return {
                statusCode: 404,
                body: JSON.stringify({ status: 'error', message: 'No payment records found' })
            };
        }

        const payments = snapshot.val();
        const paymentKey = Object.keys(payments).find(key => payments[key].orderId === order_id);
        if (!paymentKey) {
            return {
                statusCode: 404,
                body: JSON.stringify({ status: 'error', message: 'Payment record not found' })
            };
        }

        const payment = payments[paymentKey];
        const userId = payment.userId;
        const plan = payment.plan;
        const daysMap = { 'Bronze': 30, 'Silver': 60, 'Gold': 90 };
        const premiumValue = { 'Bronze': 1, 'Silver': 2, 'Gold': 3 };
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + daysMap[plan]);

        // Sasisha hali ya malipo
        await update(ref(database, `paymentRecords/${paymentKey}`), {
            status: 'completed',
            reference: reference,
            updatedAt: new Date().toISOString()
        });

        // Sasusha hali ya mtumiaji
        await update(ref(database, `users/${userId}`), {
            premium: premiumValue[plan],
            ended: endDate.toISOString().split('T')[0]
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ status: 'success', message: 'Webhook processed successfully' })
        };
    } catch (error) {
        console.error('Webhook Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ status: 'error', message: 'Failed to process webhook' })
        };
    }
};