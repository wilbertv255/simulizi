const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set, push } = require('firebase/database');

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

// ZenoPay API Key na Webhook URL
const ZENO_API_KEY = "Zcc6sV0hP4TGjfwaflRoeS0oZ4XAGifWt4KLJK-ud3N82XIT8FRnJr_pe2DFD9enP45NRsBVFwgc7GS80gHb_A";
const WEBHOOK_URL = "https://dazzling-nasturtium-bf50ff.netlify.app/.netlify/functions/webhook";

exports.handler = async function(event, context) {
    console.log('=== Function Invoked: initiate-payment ===');
    console.log('Request Event:', JSON.stringify(event, null, 2));

    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS request');
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        console.log('Method Not Allowed:', event.httpMethod);
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ status: 'error', message: 'Method Not Allowed' })
        };
    }

    let body;
    try {
        console.log('Parsing Request Body');
        body = JSON.parse(event.body || '{}');
        console.log('Parsed Body:', body);
    } catch (error) {
        console.error('JSON Parse Error:', error.message);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ status: 'error', message: 'Invalid JSON body', error: error.message })
        };
    }

    const { userId, plan, amount, method, phoneNumber, userEmail, userName } = body;

    if (!userId || !plan || !amount || !method || !phoneNumber || !userEmail || !userName) {
        console.log('Missing Required Fields:', { userId, plan, amount, method, phoneNumber, userEmail, userName });
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ status: 'error', message: 'Missing required fields' })
        };
    }

    const phonePatterns = {
        'M-Pesa': /^07[56][0-9]{7}$/,
        'Tigo Pesa': /^07[1][0-9]{7}$/,
        'Airtel Money': /^07[8][0-9]{7}$/,
        'Halotel': /^06[2][0-9]{7}$/
    };

    if (!phonePatterns[method] || !phonePatterns[method].test(phoneNumber)) {
        console.log('Invalid Phone Number for Method:', method, phoneNumber);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ status: 'error', message: `Invalid phone number for ${method}` })
        };
    }

    try {
        console.log('Generating Order ID');
        const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('Generated Order ID:', orderId);

        console.log('Sending Request to ZenoPay API');
        const response = await fetch('https://zenoapi.com/api/payments/mobile_money_tanzania', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ZENO_API_KEY
            },
            body: JSON.stringify({
                order_id: orderId,
                buyer_email: userEmail,
                buyer_name: userName,
                buyer_phone: phoneNumber,
                amount: parseInt(amount),
                webhook_url: WEBHOOK_URL
            })
        });

        console.log('ZenoPay Response Status:', response.status);
        console.log('ZenoPay Response Headers:', JSON.stringify([...response.headers]));

        let result;
        try {
            result = await response.json();
            console.log('ZenoPay Response Body:', result);
        } catch (error) {
            console.error('ZenoPay JSON Parse Error:', error.message);
            return {
                statusCode: response.status || 500,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ status: 'error', message: 'Invalid response from payment gateway', error: error.message })
            };
        }

        if (!response.ok || result.status !== 'success') {
            console.error('ZenoPay Error:', result.message || `HTTP Status: ${response.status}`);
            throw new Error(result.message || `ZenoPay API error: ${response.status}`);
        }

        console.log('Saving Payment Record to Firebase');
        const paymentsRef = ref(database, 'paymentRecords');
        const newPaymentRef = push(paymentsRef);
        await set(newPaymentRef, {
            userId: userId,
            plan: plan,
            amount: amount,
            method: method,
            phoneNumber: phoneNumber,
            orderId: orderId,
            timestamp: new Date().toISOString(),
            status: 'pending'
        });

        console.log('Payment Initiated Successfully:', orderId);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ status: 'success', message: 'Payment initiated', orderId: orderId })
        };
    } catch (error) {
        console.error('Initiate Payment Error:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ status: 'error', message: `Failed to initiate payment: ${error.message}` })
        };
    }
};