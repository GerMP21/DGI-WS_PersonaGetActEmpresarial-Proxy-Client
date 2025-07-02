// Load environment variables from a .env file into process.env
require('dotenv').config();

const soap = require('soap');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const privateKeyPath = path.resolve(__dirname, process.env.DGI_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(__dirname, process.env.DGI_PUBLIC_CERT_PATH);
const privateKeyPassword = process.env.DGI_PRIVATE_KEY_PASSWORD;
const wsdlUrl = process.env.DGI_TEST_WSDL_URL;
const endpointUrl = wsdlUrl.replace('?wsdl', ''); // The actual URL to send the request to
const testRuc = '219000090011';

async function runTest() {
    let client; // Declare client here to make it available in the catch block

    console.log(`Attempting to call DGI SOAP service via ${endpointUrl}`);

    try {
        // --- 1. Load Credentials from Files ---
        const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
        const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
        console.log('✅ Successfully loaded key and certificate from paths.');

        // --- 2. Create SOAP Client ---
        client = await soap.createClientAsync(wsdlUrl);
        console.log('✅ SOAP client created successfully.');

        // --- 3. Set the Correct Endpoint ---
        client.setEndpoint(endpointUrl);
        console.log(`✅ Client endpoint has been set.`);

        // --- 4. Attach WS-Security (CORRECTED: Using WSSecurityCert) ---
        // This is the correct class for creating a digital signature with a certificate.
        const wsSecurity = new soap.WSSecurityCert(privateKeyPem, publicKeyPem, privateKeyPassword);
        client.setSecurity(wsSecurity);
        console.log('✅ WS-Security *digital signature* attached.');

        // --- 5. Dynamically Discover the Method Path ---
        const serviceDescription = client.describe();
        const serviceName = Object.keys(serviceDescription)[0];
        const portName = Object.keys(serviceDescription[serviceName])[0];
        const methodName = Object.keys(serviceDescription[serviceName][portName])[0];
        console.log(`✅ Dynamically found method: ${serviceName}.${portName}.${methodName}`);

        // --- 6. Prepare Arguments and Invoke the Method ---
        const args = {
            Rut: testRuc
        };
        
        const requestOptions = {
            customHeaders: {
                SOAPAction: "DGI_Modernizacion_Consolidadoaction/WS_PersonaGetActEmpresarial.Execute"
            }
        };
        
        console.log(`\nInvoking method with RUT: ${testRuc} and correct headers...`);

        const [result, rawResponse, headers, rawRequest] = await client[methodName + 'Async'](args, requestOptions);

        // --- 7. Process Success ---
        console.log('✅✅✅ SUCCESS! ✅✅✅');
        console.log('\n--- Parsed JSON Response ---');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n--- Raw XML Request Sent ---');
        console.log(rawRequest);

    } catch (error) {
        // --- Error Handling ---
        console.error('❌ An error occurred during the SOAP request.');
        console.error('----------------------------------------------------');
        if (error.response) {
            console.error('HTTP Status Code:', error.response.statusCode);
            console.error('Raw HTTP Response Body:', error.response.body);
        } else {
            console.error('Primary Error Message:', error.message);
        }
        if (error.root) {
            console.error('\n--- Parsed SOAP Fault/Response ---');
            console.error(JSON.stringify(error.root, null, 2));
        }
        console.error('----------------------------------------------------');
        // Check if client was initialized before using it.
        if (client && client.lastRequest) {
            console.error('\n--- Last XML Request Sent ---');
            console.error(client.lastRequest);
        }
    }
}

runTest();