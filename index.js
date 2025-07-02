// Load environment variables from a .env file into process.env
require('dotenv').config();

const express = require('express');
const { consultarRuc } = require('./dgiClient');
const { XMLParser } = require('fast-xml-parser');

// --- Configuration & Initialization ---
const app = express();
const port = process.env.PORT || 3000;
const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN;

// --- Sanity Check ---
// Ensure the secret token is configured before starting.
if (!API_SECRET_TOKEN) {
    console.error("FATAL ERROR: API_SECRET_TOKEN is not defined in the .env file. The application cannot start.");
    process.exit(1); // Exit with an error code.
}

const cdataParser = new XMLParser();
app.use(express.json());

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Extract token from "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({
            error: true,
            source: 'Auth',
            message: 'Unauthorized: No token provided.'
        });
    }

    if (token !== API_SECRET_TOKEN) {
        return res.status(403).json({
            error: true,
            source: 'Auth',
            message: 'Forbidden: The provided token is invalid.'
        });
    }

    // Token is valid, proceed to the actual route handler
    next();
};

function mapErrorToStatus(source) {
    switch (source) {
        case 'Validation': return 400;
        case 'DGI': return 404;
        default: return 500;
    }
}

// A simple, unprotected health check endpoint
app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'DGI Proxy API is running.' });
});

// --- Protected API Endpoint ---
// The `authenticateToken` middleware is applied here.
app.get('/api/v1/consulta_ruc/:ruc', authenticateToken, async (req, res) => {
    const { ruc } = req.params;

    if (!ruc || !/^\d{12}$/.test(ruc)) {
        return res.status(400).json({
            error: true,
            source: 'Validation',
            message: 'A valid 12-digit RUC must be provided.'
        });
    }

    console.log(`[${new Date().toISOString()}] Received request for RUC: ${ruc}`);

    try {
        const result = await consultarRuc(ruc);

        if (result.error) {
            const statusCode = mapErrorToStatus(result.source);
            console.error(`[${new Date().toISOString()}] DGI Client Error for RUC ${ruc}:`, result);
            return res.status(statusCode).json(result);
        }

        if (result && result.Data && typeof result.Data === 'string') {
            const parsedCdata = cdataParser.parse(result.Data);
            const responseData = parsedCdata.WS_PersonaActEmpresarial || parsedCdata;
            console.log(`[${new Date().toISOString()}] Successfully fetched and parsed data for RUC: ${ruc}`);
            return res.status(200).json(responseData);
        }
        
        console.warn(`[${new Date().toISOString()}] Unexpected response format from client for RUC ${ruc}:`, result);
        return res.status(500).json({
            error: true,
            source: 'Server',
            message: 'Received an unexpected data format from the DGI service.'
        });

    } catch (err) {
        console.error(`[${new Date().toISOString()}] A critical server error occurred for RUC ${ruc}:`, err);
        return res.status(500).json({
            error: true,
            source: 'Server',
            message: 'An internal server error occurred.',
            detail: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`DGI Proxy API server listening at http://0.0.0.0:${port}`);
});
