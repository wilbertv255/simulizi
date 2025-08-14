export default async function handler(req, res) {
    console.log('=== Function Invoked: zenopay-proxy ===');
    console.log('Request Method:', req.method);

    // Handle CORS and OPTIONS request
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
        console.log('Parsing Request Body');
        body = req.body;
        console.log('Parsed Body:', body);
    } catch (error) {
        console.error('JSON Parse Error:', error.message);
        return res.status(400).json({ status: 'error', message: 'Invalid JSON body', error: error.message });
    }

    const { order_id, buyer_email, buyer_name, buyer_phone, amount, webhook_url } = body;

    if (!order_id || !buyer_email || !buyer_name || !buyer_phone || !amount || !webhook_url) {
        console.log('Missing Required Fields:', { order_id, buyer_email, buyer_name, buyer_phone, amount, webhook_url });
        return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    try {
        console.log('Sending Request to ZenoPay API');
        const response = await fetch('https://zenoapi.com/api/payments/mobile_money_tanzania', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ZENO_API_KEY
            },
            body: JSON.stringify({
                order_id,
                buyer_email,
                buyer_name,
                buyer_phone,
                amount,
                webhook_url
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
            return res.status(response.status || 500).json({ status: 'error', message: 'Invalid response from payment gateway', error: error.message });
        }

        if (!response.ok || result.status !== 'success') {
            console.error('ZenoPay Error:', result.message || `HTTP Status: ${response.status}`);
            return res.status(response.status || 500).json({ status: 'error', message: result.message || `ZenoPay API error: ${response.status}` });
        }

        console.log('Payment Initiated Successfully:', order_id);
        return res.status(200).json({ status: 'success', message: 'Payment initiated', orderId: order_id });
    } catch (error) {
        console.error('ZenoPay Proxy Error:', error.message);
        return res.status(500).json({ status: 'error', message: `Failed to initiate payment: ${error.message}` });
    }
}