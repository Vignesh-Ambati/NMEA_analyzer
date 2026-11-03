# Backend API Specification & Response Contract

> **Target Audience**: Backend Engineering Team (FastAPI / Python / Go / Node.js)  
> **Consumer**: GNSS NMEA Log Analyzer Web Application (Vite + React + TypeScript)  
> **Contract Status**: Active & Verified  
> **Default Base URL**: `http://127.0.0.1:8000/api`  
> **Specification Version**: 2.4.0  
> **Last Updated**: 2026-11-03

---

## 1. Architectural Overview & Configuration

The web application communicates with the backend via RESTful JSON and multipart streaming endpoints prefixed with `/api`. All configuration parameters are driven by client environment variables with sensible local defaults:

| Environment Variable | Default Value | Description |
|---|---|---|
| `VITE_BACKEND_PROTOCOL` | `http` | Communication protocol (`http` or `https`) |
| `VITE_BACKEND_HOST` | `127.0.0.1` | Hostname or IP of the backend service |
| `VITE_BACKEND_PORT` | `8000` | Port where the backend service listens |
| `VITE_API_PREFIX` | `/api` | Base path prefix for all API routes |
| `VITE_BACKEND_URL` | *(derived)* | Explicit override URL (e.g., `https://api.domain.com/api`) |
| `VITE_BACKEND_PING_INTERVAL_MS` | `1800000` | Health check heartbeat interval in ms (30 minutes) |

### 1.1 Cross-Origin Resource Sharing (CORS)
The backend must send the following HTTP headers on all responses and handle `OPTIONS` preflight requests:
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With
Access-Control-Max-Age: 86400
```

### 1.2 Standardized Error Response Format
All error responses (`4xx` client errors and `5xx` server errors) must return a consistent JSON schema. The frontend parser supports both flat and nested message structures:

```json
{
  "error": "Short human-readable error title",
  "detail": "Detailed explanation of the issue or validation specifics",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2026-11-03T07:45:00.000Z"
}
```

*Note: If using standard FastAPI `HTTPException(status_code=..., detail=...)`, a string passed to `detail` is automatically unpacked and presented in the UI.*

---

## 2. Comprehensive Endpoint Specifications & Responses

---

### 2.1 Health Check Heartbeat

Used by the frontend to detect service online status, monitor latency, and display connection diagnostics.

- **Method**: `GET`
- **Route**: `/api/health`
- **Headers**:
  - `Accept: application/json`

#### Success Response (`200 OK`)
```json
{
  "status": "healthy",
  "service": "nmea-backend",
  "version": "1.0.0",
  "api_prefix": "/api",
  "timestamp": "2026-11-03T07:45:00Z",
  "backend_state": {
    "status": "healthy",
    "last_action": "idle",
    "active_workers": 4,
    "uptime_seconds": 86400,
    "updated_at": "2026-11-03T07:45:00Z"
  }
}
```

#### Degraded / Offline Response (`503 Service Unavailable`)
```json
{
  "status": "degraded",
  "service": "nmea-backend",
  "error": "Database connection pool exhausted",
  "detail": "SQLite/PostgreSQL storage layer is currently unreachable"
}
```

---

### 2.2 Developer Authentication

Authenticates developer credentials to grant access to the Developer Suite, internal diagnostics, engine tuning, and security management.

- **Method**: `POST`
- **Route**: `/api/dev/auth`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`

#### Request Body
```json
{
  "password": "developer_password_here"
}
```

#### Success Response (`200 OK`)
```json
{
  "authenticated": true,
  "status": "ok",
  "message": "Developer authenticated successfully.",
  "user": "developer",
  "token": "optional_bearer_token_or_session_id",
  "expiresAt": "2026-11-04T07:45:00Z"
}
```

#### Rejection Response (`401 Unauthorized`)
```json
{
  "authenticated": false,
  "detail": "Invalid developer credentials. Please check your password.",
  "code": "AUTH_FAILED"
}
```

#### Validation Error (`422 Unprocessable Entity`)
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

### 2.3 Fetch Engine Tuning Parameters

Retrieves persistent global ingestion parameters (batch size, retention window, and concurrency).

- **Method**: `GET`
- **Route**: `/api/dev/engine-params`
- **Headers**:
  - `Accept: application/json`

#### Success Response (`200 OK`)
The frontend flexibly parses either camelCase or snake_case keys:
```json
{
  "batchSize": 50000,
  "retentionWindow": 30,
  "workerCount": 4,
  "updatedAt": "2026-11-03T07:40:00Z"
}
```
*Note on `retentionWindow`: Represents retention duration in days (e.g. `30`). If legacy raw seconds are returned (e.g. `2592000`), the client automatically normalizes them to days.*

#### Error Response (`500 Internal Server Error`)
```json
{
  "error": "Failed to read engine parameters",
  "detail": "Configuration database query failed"
}
```

---

### 2.4 Update Engine Tuning Parameters

Commits new engine tuning configuration into persistent storage.

- **Method**: `POST`
- **Route**: `/api/dev/engine-params`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`

#### Request Body
The client sends both camelCase and snake_case variants to ensure seamless compatibility with any backend framework:
```json
{
  "batchSize": 50000,
  "batch_size": 50000,
  "retentionWindow": 30,
  "retention_window": 30,
  "retention_days": 30,
  "retention_seconds": 2592000,
  "workerCount": 4,
  "worker_count": 4
}
```

#### Success Response (`200 OK`)
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

#### Validation Error (`422 Unprocessable Entity` or `400 Bad Request`)
```json
{
  "success": false,
  "detail": "batchSize must be between 1000 and 1000000 lines",
  "code": "INVALID_BATCH_SIZE"
}
```

---

### 2.5 Update Developer Access Password

Updates the developer suite access password. The backend must hash passwords using `scrypt`, `argon2`, or `bcrypt` before storage.

- **Method**: `POST`
- **Route**: `/api/dev/password`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`

#### Request Body
```json
{
  "currentPassword": "existing_password_string",
  "newPassword": "new_secure_password_string",
  "password": "new_secure_password_string"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Developer access password successfully updated in backend database."
}
```

#### Rejection Response (`401 Unauthorized` or `400 Bad Request`)
```json
{
  "success": false,
  "detail": "Current password does not match existing credentials.",
  "code": "PASSWORD_MISMATCH"
}
```

---

### 2.6 GNSS Log Upload & Ingestion (Direct Multipart Stream)

Streams and indexes GNSS log files (`.log`, `.txt`, `.nmea`, `.ubx`) up to 5 GB.

- **Method**: `POST`
- **Route**: `/api/nmea/upload`
- **Content-Type**: `multipart/form-data`

#### Multipart Form Fields
- `file`: Binary file upload
- `batchSize`: Batch processing size as string integer (e.g. `"50000"`)

#### Success Response (`200 OK` or `201 Created`)
```json
{
  "success": true,
  "fileId": "file_1730598120_a1b2",
  "filename": "gnss_flight_log_2026.log",
  "fileSize": 104857600,
  "totalSentences": 128450,
  "epochsCount": 12845,
  "taskId": "task_ingest_9812",
  "color": "#2563EB",
  "message": "File ingested and parsed successfully."
}
```

#### Error Responses
- `413 Payload Too Large`:
```json
{
  "detail": "File size exceeds the 5 GB maximum ingestion limit.",
  "code": "PAYLOAD_TOO_LARGE"
}
```
- `422 Unprocessable Entity`:
```json
{
  "detail": "Unrecognized or corrupted NMEA stream. Zero valid sentences detected.",
  "code": "CORRUPT_NMEA"
}
```

---

### 2.7 Chunked File Ingestion Stream (For Multi-GB Files)

Enables reliable, resumable chunked upload of multi-gigabyte log files without exhausting server RAM.

- **Method**: `POST`
- **Route**: `/api/nmea/upload-chunk`
- **Content-Type**: `multipart/form-data`

#### Multipart Form Fields
- `uploadId`: Unique session identifier (e.g. `"upl_1730598120_x9z"`)
- `filename`: Original file name string
- `totalBytes`: Total file size in bytes
- `chunkIndex`: 0-indexed integer of the chunk
- `totalChunks`: Total number of chunks
- `chunk`: Binary chunk blob (default: 8 MB per slice)

#### Intermediate Chunk Response (`200 OK`)
```json
{
  "success": true,
  "uploadId": "upl_1730598120_x9z",
  "chunkIndex": 0,
  "uploadedBytes": 8388608,
  "completed": false
}
```

#### Final Assembly Chunk Response (`200 OK`)
When `chunkIndex === totalChunks - 1`:
```json
{
  "success": true,
  "uploadId": "upl_1730598120_x9z",
  "completed": true,
  "fileId": "file_1730598120_a1b2",
  "filename": "gnss_flight_log_2026.log",
  "fileSize": 524288000,
  "totalSentences": 642250,
  "epochsCount": 64225,
  "taskId": "task_ingest_9812",
  "message": "Chunk assembly and index complete."
}
```

---

### 2.8 Asynchronous Task Status & Live Telemetry

Used for polling long-running background tasks (ingestion, complex calculations, and analysis).

- **Method**: `GET`
- **Route**: `/api/tasks/{taskId}`
- **Headers**:
  - `Accept: application/json`

#### Success Response (`200 OK`)
```json
{
  "taskId": "task_ingest_9812",
  "status": "running",
  "statusText": "Indexing GNSS epochs and SV constellations (65%)...",
  "progressPct": 65,
  "totalSentences": 65000,
  "processedBytes": 68157440,
  "totalBytes": 104857600,
  "throughputMBps": "42.8 MB/s",
  "elapsedSeconds": "1.58s",
  "error": null
}
```
*Allowed values for `status`: `"idle"`, `"initializing"`, `"running"`, `"completed"`, `"cancelled"`, `"error"`.*

#### Completed Task Response (`200 OK`)
```json
{
  "taskId": "task_ingest_9812",
  "status": "completed",
  "statusText": "Processing complete: 128,450 sentences indexed",
  "progressPct": 100,
  "totalSentences": 128450,
  "throughputMBps": "48.2 MB/s",
  "elapsedSeconds": "2.16s",
  "result": {
    "fileId": "file_1730598120_a1b2",
    "epochsCount": 12845
  }
}
```

#### Task Not Found (`404 Not Found`)
```json
{
  "error": "Task not found",
  "detail": "No active or recorded task with ID task_ingest_9812",
  "code": "TASK_NOT_FOUND"
}
```

---

### 2.9 Task Matrix Plot Points & Chart Analytics

Calculates downsampled time-series data points for the 9 core GNSS engineering tasks.

- **Method**: `GET` or `POST`
- **Route**: `/api/tasks/{taskId}/points?fileId={fileId}&downsample={downsample}`
  *(Alternative: `POST /api/tasks/{taskId}/calculate` with JSON body `{"fileId": "file_xxx", "parameters": {}}`)*
- **Headers**:
  - `Accept: application/json`

#### Task Identification Mapping:
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
    { "time": 1730598000, "value": 142.50, "label": "12:00:00", "metadata": { "fixQuality": 1 } },
    { "time": 1730598001, "value": 143.15, "label": "12:00:01", "metadata": { "fixQuality": 1 } },
    { "time": 1730598002, "value": 144.02, "label": "12:00:02", "metadata": { "fixQuality": 2 } },
    { "time": 1730598003, "value": 144.80, "label": "12:00:03", "metadata": { "fixQuality": 2 } }
  ],
  "summary": {
    "min": 142.50,
    "max": 144.80,
    "avg": 143.62,
    "stdDev": 0.88,
    "count": 4
  }
}
```

---

### 2.10 Task Cancellation

Halts execution of an in-flight server task and releases backend compute resources.

- **Method**: `POST`
- **Route**: `/api/tasks/{taskId}/cancel`
- **Headers**:
  - `Accept: application/json`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "taskId": "task_ingest_9812",
  "status": "cancelled",
  "message": "Task was successfully cancelled and workers released."
}
```

---

### 2.11 Diagnostic Logs Collection

Receives client diagnostics or emits recent backend system logs.

#### GET `/api/dev/logs`
Returns the recent in-memory server log buffer for the Developer Suite.

- **Headers**: `Accept: application/json`

##### Success Response (`200 OK`)
```json
{
  "logs": [
    {
      "id": "log-srv-1730598120-101",
      "timestamp": "12:00:01.250",
      "isoDate": "2026-11-03T07:45:01.250Z",
      "stage": "network",
      "level": "info",
      "message": "POST /api/dev/auth completed with 200 OK in 12ms"
    }
  ],
  "total": 1
}
```

---

## 3. Architecture Specification for Data Extractor Pro

> **Important Architecture Decision**:  
> Per specification, **Data Extractor Pro** executes **100% inside the client browser** using an inline background Web Worker and chunked 8 MB stream processing. It consumes **0 server CPU, 0 backend RAM, and makes no network calls to FastAPI**.

However, if headless CLI batch extraction or automated server workflows are implemented by the backend team, the optional server endpoints follow this schema:

### 3.1 Optional Server-Side Extraction (`POST /api/extraction/bulk-line-copy`)
- **Request Body**:
```json
{
  "jobId": "job_ext_1730598120_abc1",
  "sourceType": "file_upload",
  "sourcePath": "C:\\logs\\flight_telemetry.log",
  "targetExpression": "^\\$(GP|GN)GGA",
  "searchMode": "regex",
  "batchSize": 50000,
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
    "endLine": 1000000
  }
}
```

- **Success Response (`200 OK`)**:
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

---

## 4. Common Data Models & TypeScript Types

### 4.1 Parsed Sentence Schema
```typescript
interface BackendParsedSentence {
  raw: string;          // Full raw sentence including '$' and checksum
  talker: string;       // GP, GL, GN, GA, GB
  type: string;         // GGA, RMC, GSA, GSV, VTG, ZDA
  timestamp: number;    // UNIX epoch seconds
  timeStr: string;      // "HH:MM:SS"
  fields: string[];     // Comma-delimited token array
  validChecksum: boolean;
}
```

### 4.2 Aggregated Epoch Record Schema
```typescript
interface BackendEpochData {
  time: number;         // UNIX epoch seconds
  timeStr: string;      // "HH:MM:SS"
  dateStr?: string;     // "YYYY-MM-DD"
  latitude?: number;    // Decimal degrees (+ = North, - = South)
  longitude?: number;   // Decimal degrees (+ = East, - = West)
  altitude?: number;    // Height above MSL in meters
  speedKmh?: number;    // Speed over ground in km/h
  heading?: number;     // True track heading in degrees (0.0 to 360.0)
  fixQuality?: number;  // 0=Invalid, 1=SPS, 2=DGPS, 4=RTK Fix, 5=Float RTK
  satellitesUsed?: number;
  hdop?: number;
  pdop?: number;
  vdop?: number;
  avgCn0?: number;      // Average satellite carrier-to-noise ratio in dB-Hz
}
```

### 4.3 Engine Tuning Parameters Schema
```typescript
interface EngineTuningParams {
  batchSize: number;        // Processing chunk size in lines (e.g. 50,000)
  retentionWindow: number;  // Historical retention in days (e.g. 30)
  workerCount: number;      // Concurrency thread/worker count (e.g. 4)
  updatedAt?: string;       // ISO 8601 timestamp string
}
```

---
*For any questions regarding schemas, field constraints, or UI integration behaviors, refer to the frontend source in `/src/backend/` and `/src/services/`.*
