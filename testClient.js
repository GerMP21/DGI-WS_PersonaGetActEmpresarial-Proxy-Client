// Load environment variables from a .env file into process.env
require('dotenv').config();

// Import the function we want to test
const { consultarRuc } = require('./dgiClient.js');

// --- Test Configuration ---
// Use a RUC from environment variables, or default to a known test RUC
const testRuc = process.env.DGI_TEST_RUC || '219000090011';

/**
 * An asynchronous, self-executing function to run the test.
 */
(async () => {
    // Check if required environment variables are present
    if (!process.env.DGI_PROD_URL || !process.env.DGI_PRIVATE_KEY_PATH || !process.env.DGI_PUBLIC_CERT_PATH) {
        console.error("❌ ERROR: Missing required environment variables in your .env file.");
        console.error("Please ensure DGI_PROD_URL, DGI_PRIVATE_KEY_PATH, and DGI_PUBLIC_CERT_PATH are set.");
        return; // Stop execution
    }

    console.log(`🚀 Attempting to consult RUC: ${testRuc} using dgiClient.js...`);
    console.log("----------------------------------------------------");

    const result = await consultarRuc(testRuc);

    console.log("----------------------------------------------------");
    console.log("✅ Test execution finished.");

    // --- Process the result ---
    if (result && !result.error) {
        console.log("\n✅✅✅ SUCCESS! ✅✅✅");
        console.log("--- Parsed DGI Response ---");
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.error("\n❌❌❌ FAILURE! ❌❌❌");
        console.error("--- Structured Error Details ---");
        console.error(`Source:  ${result.source}`);
        console.error(`Code:    ${result.code}`);
        console.error(`Detail:  ${result.detail}`);
        
        // Optionally log the raw underlying error for deeper debugging
        // console.error("\n--- Raw Error Object ---");
        // console.error(result.raw);
    }
})();
