Of course. Here is a complete, rewritten README.md from scratch. It is structured for clarity, easy onboarding, and professional presentation.

---

# DGI RUC Consultation API Proxy

![Node.js](https://img.shields.io/badge/Node.js-16.x+-green.svg)![Express.js](https://img.shields.io/badge/Express.js-4.x-blue.svg)![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A production-ready Node.js server that provides a modern, secure RESTful API for querying taxpayer information (RUC) from Uruguay's DGI SOAP web service.

This application acts as a middleware, abstracting away the complexities of SOAP, WS-Security digital signatures, and nested XML parsing, exposing a simple and clean JSON endpoint protected by bearer token authentication.

## The Problem It Solves

Interacting directly with the DGI's SOAP services is challenging. It requires:
1.  Manual construction of SOAP envelopes.
2.  Complex request signing using WS-Security with a private key.
3.  Handling responses that contain XML data embedded within a CDATA section.

This proxy handles all of these complexities, allowing developers to consume DGI data through a standard, easy-to-use JSON API.

## Features

-   **Secure API Endpoint**: All requests are authenticated using a secret Bearer Token.
-   **Automated SOAP & WS-Security**: Manages all client-side logic for SOAP communication and digital signatures automatically.
-   **Clean JSON Transformation**: Parses the DGI's `XML-in-CDATA` response into a structured JSON object.
-   **Robust Error Handling**: Provides clear, actionable error messages with appropriate HTTP status codes (e.g., 400, 401, 403, 404, 500).
-   **Configuration Driven**: No hardcoded credentials. All configuration is managed via environment variables.
-   **Lightweight & Performant**: Built with Express.js for minimal overhead.

## Prerequisites

-   **Node.js**: Version 16.x or newer is recommended.
-   **NPM**: Included with Node.js.
-   **DGI Digital Certificates**: You must have a valid private key (`.pem`) and public certificate (`.pem`) pair provided by DGI.

## Installation and Configuration

Follow these steps to get the server running.

### 1. Clone the Repository```sh
git clone <your-repository-url>
cd <your-repository-directory>
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Set Up Certificates
Create a `certs` directory in the project root and place your DGI certificate files inside it. The application expects the following structure:
```
/
└─ certs/
   ├─ private_key.pem
   └─ public_cert.pem
```

### 4. Configure Environment Variables
Create a `.env` file in the project root. You can copy the example file to get started:
```sh
cp .env.example .env
```
Now, edit the `.env` file with your specific configuration.

**Important**: You must generate a strong, secret token for `API_SECRET_TOKEN`.
Use a tool like OpenSSL to generate one:
```sh
openssl rand -base64 32
```
Copy the output and use it as your `API_SECRET_TOKEN`.

#### `.env.example`
```env
# ----------------------------------
# DGI WEB SERVICE CONFIGURATION
# ----------------------------------
# The production endpoint for the DGI service (without ?wsdl)
DGI_PROD_URL=https://efactura.dgi.gub.uy:6475/efactura/ws_personaGetActEmpresarial

# ----------------------------------
# CERTIFICATE CONFIGURATION
# ----------------------------------
# Path to your private key file, relative to the project root.
DGI_PRIVATE_KEY_PATH=./certs/private_key.pem

# Path to your public certificate file, relative to the project root.
DGI_PUBLIC_CERT_PATH=./certs/public_cert.pem

# The password for your private key, if it is encrypted. Leave blank if there is no password.
DGI_PRIVATE_KEY_PASSWORD=your_secret_password

# ----------------------------------
# API SERVER CONFIGURATION
# ----------------------------------
# The port the API server will listen on.
PORT=3000

# A secret bearer token for authorizing API requests. Generate a strong, random string for this.
API_SECRET_TOKEN=your-very-secret-and-strong-token
```
> **Security Note**: The `.gitignore` file is pre-configured to ignore `.env` and `certs/` to prevent accidental exposure of your secrets.

## Running the Application

To start the API proxy server, run:
```sh
node api.js
```
The console will confirm that the server is running:
```
DGI Proxy API server listening at http://localhost:3000
```

For development, it is recommended to use `nodemon` to automatically restart the server when files are changed:
```sh
npx nodemon api.js
```

## API Endpoint Reference

### Get Company Information by RUC

Retrieves public business activity information for a given RUC.

`GET /api/v1/consulta_ruc/:ruc`

#### Headers
-   `Authorization` (Required): Your secret bearer token.
    -   **Format**: `Bearer <API_SECRET_TOKEN>`

#### URL Parameters
-   `ruc` (Required): The 12-digit company RUC.

---
#### Example Request (`curl`)

Replace `your-very-secret-and-strong-token` with the token from your `.env` file.```sh
curl -X GET \
  -H "Authorization: Bearer your-very-secret-and-strong-token" \
  http://localhost:3000/api/v1/consulta_ruc/219000090011
```

---
#### Response Bodies

-   **`200 OK`**: The request was successful.
    ```json
    {
      "RUT": 219000090011,
      "Denominacion": "DGI RUC PRUEBA CEDE",
      "NombreFantasia": "TU PRUEBA",
      "TipoEntidad": 6,
      "DescripcionTipoEntidad": "SOCIEDAD COLECTIVA",
      "EstadoActividad": "AA",
      "FechaInicioActivdad": "2006-09-27",
      "WS_DomFiscalLocPrincipal": { "...": "..." },
      "WS_PersonaActividades": { "...": "..." }
    }
    ```
-   **`400 Bad Request`**: The RUC format is invalid.
    ```json
    {
      "error": true,
      "source": "Validation",
      "message": "A valid 12-digit RUC must be provided."
    }
    ```
-   **`401 Unauthorized`**: The `Authorization` header is missing.
    ```json
    {
      "error": true,
      "source": "Auth",
      "message": "Unauthorized: No token provided."
    }
    ```
-   **`403 Forbidden`**: The provided bearer token is incorrect.
    ```json
    {
      "error": true,
      "source": "Auth",
      "message": "Forbidden: The provided token is invalid."
    }
    ```
-   **`404 Not Found`**: The RUC is valid but was not found by DGI, or DGI returned a specific error.
    ```json
    {
      "error": true,
      "source": "DGI",
      "code": "DGI_ERROR_CODE",
      "detail": "Error detail from DGI.",
      "raw": { "...": "..." }
    }
    ```-   **`500 Internal Server Error`**: A problem occurred on the proxy server (e.g., bad credentials, DGI service unavailable).
    ```json
    {
      "error": true,
      "source": "Server",
      "message": "An internal server error occurred."
    }
    ```

## Project Structure```
.
├── certs/                # Directory for your .pem files (ignored by git)
├── node_modules/         # Project dependencies (ignored by git)
├── .env                  # Environment variables (ignored by git)
├── .env.example          # Example environment variables file
├── .gitignore            # Files to ignore for version control
├── api.js                # The Express server, routing, and auth logic
├── dgiClient.js          # The SOAP client for interacting with DGI
├── package-lock.json
└── package.json
```

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.