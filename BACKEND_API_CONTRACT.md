# Backend API Specification & Contract
> **Target Audience**: Backend Development Team (FastAPI / Python / Go / Node.js)  
> **Consumer**: NMEA Log Analyzer Web Frontend (Vite + React + TypeScript)  
> **Status**: Approved Frontend Contract  
> **Default Base URL**: `http://127.0.0.1:8000/api`

---

## 1. Architectural Overview & Configuration

The frontend communicates with the backend through REST endpoints under a configurable prefix (`/api` by default). The frontend reads these runtime variables from `.env` or client environment:

| Environment Variable | Default Value | Description |
|---|---|---|
| `VITE_BACKEND_PROTOCOL` | `http` | Communication protocol (`http` or `https`) |
| `VITE_BACKEND_HOST` | `127.0.0.1` | Hostname or IP of the backend service |
| `VITE_BACKEND_PORT` | `8000` | Port where backend listens |
| `VITE_API_PREFIX` | `/api` | Base path prefix for all API routes |
| `VITE_BACKEND_URL` | *(derived)* | Explicit override URL (e.g. `https://api.domain.com/api`) |
| `VITE_BACKEND_PING_INTERVAL_MS` | `1800000` | Health check interval in ms (30 minutes) |

### 1.1 CORS Requirements
The backend must enable Cross-Origin Resource Sharing (CORS) with the following headers:
- `Access-Control-Allow-Origin`: `*` (or the frontend origin in production)
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, Accept, X-Requested-With`

### 1.2 Unified Error Response Format
All `4xx` and `5xx` responses must return JSON conforming to this schema:
```json
{
  "error": "Short human-readable error description",
  "detail": "Detailed diagnostic information or validation specifics",
  "code": "ERROR_CODE_STRING",
  "timestamp": "2026-11-03T07:45:00.000Z"
}
```

---

## 2. API Endpoints Specification

### 2.1 Health Check
Verifies backend service availability, database connectivity, and readiness.

- **Method**: `GET`
- **Route**: `/api/health`
- **Headers**:
  - `Accept: application/json`

#### Success Response (`200 OK`)
```json
{
  "status": "ok",
  "service": "nmea-backend",
  "api_prefix": "/api",
  "backend_state": {
    "status": "healthy",
    "last_action": "idle",
    "updated_at": "2026-11-03T07:45:00Z"
  }
}
```

---

### 2.2 Developer Authentication
Validates developer credentials against the backend user database.

- **Method**: `POST`
- **Route**: `/api/dev/auth`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`

#### Request Body
```json
{
  "password": "string (required)"
}
```

#### Success Response (`200 OK`)
```json
{
  "authenticated": true,
  "message": "Developer authenticated successfully.",
  "status": "ok",
  "user": "developer"
}
```

#### Error Responses
- `401 Unauthorized`:
```json
{
  "authenticated": false,
  "detail": "Invalid developer credentials. Please check your password."
}
```

---

### 2.3 Developer Engine Tuning Parameters
Manages global ingestion and processing settings: batch size, retention window, and concurrency.

#### GET `/api/dev/engine-params`
Fetches active tuning parameters from backend storage.

- **Headers**: `Accept: application/json`

##### Success Response (`200 OK`)
```json
{
  "batchSize": 50000,
  "retentionWindow": 30,
  "workerCount": 4,
  "updatedAt": "2026-11-03T07:40:00Z"
}
```

#### POST `/api/dev/engine-params`
Updates and commits engine tuning parameters.

- **Headers**: `Content-Type: application/json`, `Accept: application/json`

##### Request Body
```json
{
  "batchSize": 50000,
  "retentionWindow": 30,
  "workerCount": 4
}
```

##### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Engine parameters synchronized with backend database.",
  "params": {
    "batchSize": 50000,
    "retentionWindow": 30,
    "workerCount": 4,
    "updatedAt": "2026-11-03T07:45:10Z"
  }
}
```

---

### 2.4 Developer Password Update
Updates developer access password in backend storage.

- **Method**: `POST`
- **Route**: `/api/dev/password`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "currentPassword": "string (optional)",
  "newPassword": "string (required, min length 6)"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Developer access password successfully updated in backend database."
}
```

---

### 2.5 File Upload & GNSS Ingestion (up to 5 GB)
Supports multipart streaming of large log files (`.log`, `.txt`, `.nmea`, `.ubx`) without loading the entire payload into server RAM.

#### Option A: Direct Multipart Stream
- **Method**: `POST`
- **Route**: `/api/nmea/upload`
- **Content-Type**: `multipart/form-data`

##### Form Fields
- `file`: Binary file upload
- `batchSize`: Integer string (e.g. `"50000"`)

##### Success Response (`200 OK`)
```json
{
  "success": true,
  "fileId": "file_1730598120_a1b2",
  "filename": "flight_test_01.log",
  "fileSize": 104857600,
  "totalSentences": 128450,
  "epochsCount": 12845,
  "taskId": "task_ingest_9812"
}
```

#### Option B: Chunked Upload Stream
- **Method**: `POST`
- **Route**: `/api/nmea/upload-chunk`
- **Content-Type**: `multipart/form-data`

##### Form Fields
- `uploadId`: Unique session ID string
- `filename`: Original file name string
- `totalBytes`: Total file size in bytes
- `chunkIndex`: 0-indexed chunk integer
- `chunk`: Binary chunk blob (default 8 MB per chunk)

##### Success Response (`200 OK`)
```json
{
  "success": true,
  "uploadId": "upl_1730598120_x9z",
  "chunkIndex": 0,
  "uploadedBytes": 8388608
}
```

---

### 2.6 Asynchronous Task Status & Telemetry
Monitors background ingestion, parsing, and extraction tasks.

- **Method**: `GET`
- **Route**: `/api/tasks/{taskId}`
- **Headers**: `Accept: application/json`

#### Success Response (`200 OK`)
```json
{
  "taskId": "task_ingest_9812",
  "status": "running",
  "statusText": "Parsing GNSS sentences (45%)...",
  "progressPct": 45,
  "totalSentences": 65000,
  "throughputMBps": "32.4 MB/s",
  "elapsedSeconds": "3.12s"
}
```
*Possible values for `status`: `"idle"`, `"initializing"`, `"running"`, `"completed"`, `"cancelled"`, `"error"`.*

---

### 2.7 Task Matrix Points & Chart Analytics
Calculates and returns time-series plot data points for the 9 core GNSS analysis tasks.

- **Method**: `GET` or `POST`
- **Route**: `/api/tasks/{taskId}/points?fileId={fileId}`
  *(Alternative `POST /api/tasks/{taskId}/calculate` with payload `{"fileId": "...", "parameters": {}}`)*

#### Core Tasks Mapping:
1. **Task 1**: Carrier-to-Noise Ratio (C/N0) [Unit: `dB-Hz`]
2. **Task 2**: Estimated Processor Load (MIPS) [Unit: `MIPS`]
3. **Task 3**: Position Fix Loss / Outages [Unit: `status` (0=loss, 1=valid)]
4. **Task 4**: Altitude (MSL & Ellipsoidal) [Unit: `m`]
5. **Task 5**: Dilution of Precision (HDOP, VDOP, PDOP) [Unit: `dimensionless`]
6. **Task 6**: Tracked & Used Satellite Count (SV Count) [Unit: `sats`]
7. **Task 7**: Receiver Reset Counter [Unit: `events`]
8. **Task 8**: SBAS Differential Corrections [Unit: `active` (0 or 1)]
9. **Task 9**: Comprehensive Statistical Summary [Unit: `%`]

#### Success Response (`200 OK`)
```json
{
  "taskId": 4,
  "fileId": "file_1730598120_a1b2",
  "points": [
    { "time": 1730598000, "value": 142.5, "label": "12:00:00" },
    { "time": 1730598001, "value": 143.1, "label": "12:00:01" },
    { "time": 1730598002, "value": 144.0, "label": "12:00:02" }
  ],
  "summary": {
    "min": 142.5,
    "max": 144.0,
    "avg": 143.2,
    "count": 3
  }
}
```

---

### 2.8 Bulk Line Copy & Data Extraction
Performs server-side Notepad++-style pattern matching, line filtering, and temp file creation.

- **Method**: `POST`
- **Route**: `/api/extraction/bulk-line-copy`
- **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "jobId": "job_ext_1730598120_abc1",
  "sourceType": "file_upload",
  "targetExpression": "$GPGGA",
  "searchMode": "normal",
  "batchSize": 500,
  "options": {
    "matchCase": true,
    "matchWholeWord": false,
    "wrapAround": true,
    "bookmarkLine": false,
    "purgeEachSearch": true,
    "backwardDirection": false,
    "inSelection": false,
    "dotMatchesNewline": false,
    "stripChecksum": false,
    "removeEmptyLines": true,
    "startLine": 1,
    "endLine": 100000
  }
}
```
*`searchMode` values: `"normal"`, `"extended"` (`\n`, `\t`, `\xHH`), `"regex"`.*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "jobId": "job_ext_1730598120_abc1",
  "tempFile": {
    "id": "temp_job_ext_1730598120_abc1",
    "name": "temp_extracted_stream.tmp",
    "path": "/tmp/DataExtractor/temp_extracted_stream.tmp",
    "sizeBytes": 204850,
    "totalLines": 2500,
    "lines": [
      "$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47",
      "$GPGGA,123520,4807.040,N,01131.005,E,1,08,0.9,545.6,M,46.9,M,,*42"
    ]
  }
}
```

#### Extraction Job Cancellation
- **Method**: `POST`
- **Route**: `/api/extraction/cancel/{jobId}`
- **Success Response**: `{"success": true, "message": "Extraction job cancelled."}`

#### Temp File Export / Save
- **Method**: `POST`
- **Route**: `/api/extraction/save`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "tempFileId": "temp_job_ext_1730598120_abc1",
  "destinationPath": "output/filtered_gga.log",
  "format": "log"
}
```
- **Success Response**:
```json
{
  "success": true,
  "filePath": "output/filtered_gga.log",
  "sizeBytes": 204850,
  "message": "File saved successfully."
}
```

---

## 3. Data Structures & Common Types

### 3.1 NMEA Parsed Sentence
```typescript
interface BackendParsedSentence {
  raw: string;          // Full raw sentence including '$' and checksum
  talker: string;       // GP, GL, GN, GA, GB
  type: string;         // GGA, RMC, GSA, GSV, VTG, ZDA
  timestamp: number;    // UNIX epoch in seconds
  timeStr: string;      // Formatted "HH:MM:SS"
  fields: string[];     // Comma-delimited token array
  validChecksum: boolean;
}
```

### 3.2 Aggregated Epoch Record
```typescript
interface BackendEpochData {
  time: number;         // UNIX epoch seconds
  timeStr: string;      // "HH:MM:SS"
  dateStr?: string;     // "YYYY-MM-DD"
  latitude?: number;    // Decimal degrees (+ = North, - = South)
  longitude?: number;   // Decimal degrees (+ = East, - = West)
  altitude?: number;    // Height above MSL in meters
  speedKmh?: number;    // Speed over ground in km/h
  heading?: number;     // True heading track in degrees (0-360)
  fixQuality?: number;  // 0=Invalid, 1=SPS, 2=DGPS, 4=RTK Fix, 5=Float RTK
  satellitesUsed?: number;
  hdop?: number;
  pdop?: number;
  vdop?: number;
  avgCn0?: number;      // Average satellite carrier-to-noise ratio in dB-Hz
}
```
