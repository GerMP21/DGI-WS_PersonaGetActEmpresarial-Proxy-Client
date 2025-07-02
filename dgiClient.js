const fs = require('fs');
const path = require('path');
const soap = require('soap');

// --- Configuration ---
const prodEndpoint = process.env.DGI_PROD_URL;
const prodWsdlUrl = `${prodEndpoint}?wsdl`;
const privateKeyPath = path.resolve(__dirname, process.env.DGI_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(__dirname, process.env.DGI_PUBLIC_CERT_PATH);
const privateKeyPassword = process.env.DGI_PRIVATE_KEY_PASSWORD;

function parseSoapError(soapError) {
    // ... (This function remains unchanged)
    let source = 'Client';
    let detail = soapError.message;
    let code = '-';
    let raw = soapError;
    if (soapError.root && soapError.root.Envelope && soapError.root.Envelope.Body && soapError.root.Envelope.Body.Fault) {
        source = 'DGI';
        const fault = soapError.root.Envelope.Body.Fault;
        try {
            const respuesta = fault.detail.GenericFault.Respuestas.Respuesta;
            code = respuesta.Codigo || '-';
            detail = respuesta.Detalle || 'Unknown DGI Error';
        } catch (e) {
            detail = fault.faultstring || 'Failed to parse DGI error structure.';
        }
    } else if (soapError.response) {
        source = 'Network';
        detail = `HTTP Error: ${soapError.response.statusCode}. ${soapError.response.body}`;
    }
    return { error: true, source, code, detail, raw };
}

async function consultarRuc(ruc) {
    try {
        const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
        const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');

        const client = await soap.createClientAsync(prodWsdlUrl);
        client.setEndpoint(prodEndpoint);

        const wsSecurity = new soap.WSSecurityCert(privateKeyPem, publicKeyPem, privateKeyPassword);
        client.setSecurity(wsSecurity);

        // --- FIX: Dynamically discover the method name ---
        // This logic is copied from the working testDgi.js to ensure robustness.
        const serviceDescription = client.describe();
        const serviceName = Object.keys(serviceDescription)[0];
        const portName = Object.keys(serviceDescription[serviceName])[0];
        const methodName = Object.keys(serviceDescription[serviceName][portName])[0];
        // The discovered methodName will be "WS_PersonaGetActEmpresarial.Execute"

        const args = { Rut: ruc };
        const requestOptions = {
            customHeaders: {
                SOAPAction: "DGI_Modernizacion_Consolidadoaction/WS_PersonaGetActEmpresarial.Execute"
            }
        };

        // --- FIX: Use the discovered method name to make the call ---
        // The soap library creates an Async version of the discovered method.
        const [result] = await client[methodName + 'Async'](args, requestOptions);
        
        return result;

    } catch (error) {
        console.error("--- SOAP Request Failed ---");
        // Use error.message for the primary detail
        console.error(error.message);
        // The soap library often puts the last raw XML request on the error object
        if (error.lastRequest) {
            console.error("--- Last XML Request Sent ---");
            console.error(error.lastRequest);
        }
        return parseSoapError(error);
    }
}

module.exports = { consultarRuc };