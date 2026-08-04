
# SmartFinance Bills System

A comprehensive bill management and tracking system that automates bill processing, categorization, and spreadsheet updates using Google Drive, Google Sheets, and Firestore.

## 🎯 System Overview

The SmartFinance Bills system is composed of three main components that work together to provide an end-to-end bill management solution:

```
┌──────────────────────────────────────────────────┐
│        SmartFinance Bills Core System            │
├──────────────────────────────────────────────────┤
│                                                  │
│         ┌─────────────────────────┐             │
│         │    sfin-bills Engine    │             │
│         │  • File Processing      │             │
│         │  • Category Mapping     │             │
│         │  • Spreadsheet Updates  │             │
│         └─────────────────────────┘             │
│                   ▼                             │
│  ┌──────────────────────────────────┐          │
│  │   Google Cloud & Sheets APIs     │          │
│  │ • Drive  • Sheets  • Firestore   │          │
│  │ • Pub/Sub  • Auth                │          │
│  └──────────────────────────────────┘          │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 📦 Components

### 1. **sfin-bills** (Core Engine)
The main server-side application that orchestrates bill processing and spreadsheet management.

**Location:** `/sfin-bills`

**Key Responsibilities:**
- Monitors Google Drive for bill-related files (`comprovante`, `pix`, `fatura`)
- Extracts and parses file metadata
- Updates Google Sheets with processed bill data
- Manages bill categorization and mapping
- Handles OAuth2 authentication with Google APIs
- Processes Pub/Sub messages from Google Cloud

**Tech Stack:**
- Node.js (ES Modules)
- Google Drive API v3
- Google Sheets API
- Google Cloud Firestore
- Google Cloud Pub/Sub
- Python (for PDF extraction)

**Key Files:**
- `sfin_bills_server.mjs` - HTTP server and OAuth2 orchestration
- `file_loader.mjs` - Google Drive file processing and filtering
- `spreadsheet.mjs` - Google Sheets update logic
- `pdf-extraction/main.py` - PDF bill extraction

---



## 🔄 System Workflow

### Bill Processing Flow

```
1. Google Drive Monitoring
   └─► File detected (comprovante/pix/fatura)
       └─► Filtered by modification date (current month)
           └─► Processed by file_loader.mjs

2. File Processing
   └─► Filename parsed for bill data
       └─► Validation against naming standards
           └─► Category mapping applied via Firestore

3. Spreadsheet Update
   └─► Month reference identified in Google Sheets
       └─► Working column determined
           └─► Cell values updated with bill data
               └─► Data persisted to Google Sheets

4. Configuration Management
   └─► Firestore stores category mappings
       └─► Dynamic configuration retrieved at runtime
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v14.21.3 or higher
- Google Cloud Project with:
  - Google Drive API enabled
  - Google Sheets API enabled
  - Firestore database configured
  - Pub/Sub topics created
- Google credentials JSON file
- Google OAuth2 token

### Installation

#### 1. Core Engine (sfin-bills)

```bash
cd sfin-bills
npm install
```

**Environment Variables:**
```bash
HOME=/home/user                          # Home directory for credentials
credentials=path/to/credentials.json     # Google Cloud service account
spreadsheet=SPREADSHEET_ID               # Google Sheets document ID
category_column=2                        # Column index for categories (0-based)
months_row=1                             # Row index for months
settings_document_cfg=settings           # Firestore settings document
document_cfg=bills_mapping               # Firestore bills mapping document
collection=bills                         # Firestore bills registration collection
```

**Start Server:**
```bash
npm start
# Server runs on port 8321
```



---

## 🛠️ Key Features

### Automated Bill Processing
- Real-time monitoring of Google Drive for bill files
- Intelligent file filtering by modification date
- Support for multiple bill types (comprovante, pix, fatura)

### Smart Categorization
- Automatic category mapping from filenames
- Configurable categorization rules
- Unmapped bill detection and reporting

### Spreadsheet Integration
- Automatic monthly tracking in Google Sheets
- Intelligent column and month detection
- Multi-currency support (factor: 100)

### Configuration Management
- Firestore-backed settings
- Dynamic category mapping
- Environment-based configuration

### PDF Extraction
- Python-based PDF bill extraction
- Structured data parsing

### REST API
- Category management endpoints
- Settings configuration API
- Integration webhook support

---

## 📂 Project Structure

```
sfin-bills/
├── sfin_bills_server.mjs      # OAuth2 & HTTP server entry point
├── file_loader.mjs            # Google Drive file processing
├── spreadsheet.mjs            # Google Sheets update logic
├── pdf-extraction/
│   ├── main.py                # PDF extraction script
│   └── requirements.txt        # Python dependencies
├── test/                       # Unit tests (Mocha)
│   ├── file_loader_test.mjs
│   └── spreadsheet_test.mjs
├── scripts/                    # Utility scripts
├── Dockerfile                  # Container configuration
├── cloudbuild.yaml            # Google Cloud Build config
├── package.json               # Node.js dependencies
└── README.md                  # This file
```

---

## 🔐 Security & Authentication

### Google OAuth2
- OAuth2 flow for Google Drive and Sheets API access
- Token storage in `~/.credentials/token.json`
- Automatic token refresh on expiration

### Google Cloud Authentication
- Service account credentials for Firestore and Pub/Sub
- Environment-based credential file configuration
- Scoped API permissions

### Required Credentials
```
~/.credentials/
├── client_secret.json                    # OAuth2 secrets
├── token.json                            # OAuth2 token
└── SmartFinance-Bills-Beta-*.json       # Service account key
```

---

## 📊 Firestore Collections

### `bills_config`
- `settings` - Global application settings
- `bills_mapping_test` - Example of Category to bill mappings

### Data Structure Example
```javascript
{
  "bills_mapping_test": {
    "categories": {
      "housing": ["casa", "aluguel"],
      "utilities": ["agua", "luz", "gas"],
      "food": ["supermercado", "restaurante"],
      "transportation": ["uber", "combustivel"]
    }
  }
}
```

---

## 📈 Deployment

### Docker Deployment
```bash
docker build -t sfin-bills .
docker run -e HOME=/root \
           -e credentials=/path/to/credentials.json \
           -v ~/.credentials:/root/.credentials \
           sfin-bills
```

### Google Cloud Deployment
- Uses `cloudbuild.yaml` for automated builds
- Container-based deployment
- Environment configuration via Cloud Build secrets

---

## 🧪 Testing

### Running Tests
```bash
cd sfin-bills
npm test
```

Tests use Mocha and expect.js framework.

**Test Files:**
- `test/file_loader_test.mjs` - File processing and Google Drive integration tests
- `test/spreadsheet_test.mjs` - Spreadsheet update and data handling tests

---

## 📝 Environment Configuration

### File Naming Convention
Bills must follow naming convention for proper processing:
```
[TYPE]_[IDENTIFIER_SOURCE]_[VALUE]

Examples:
- comprovante_contaluz_10000
- pix_mercado_4500
- fatura_lojaderoupa_15559
```

**Supported File Types:**
- `comprovante` - Bill proof/receipt
- `pix` - Instant payment receipt
- `fatura` - Invoice/bill

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `category_column` | - | Spreadsheet column for categories |
| `months_row` | 1 | Spreadsheet row containing months |
| `settings_document_cfg` | settings | Firestore settings document |
| `document_cfg` | bills_mapping_test | Firestore mapping document |

---

## 🔗 External Integrations

### Google APIs
- **Google Drive API v3** - File monitoring and retrieval
- **Google Sheets API** - Spreadsheet updates
- **Google Cloud Firestore** - Data persistence
- **Google Cloud Pub/Sub** - Event messaging
- **Google Auth Library** - OAuth2 & JWT authentication

### Locale & Timezone
- Moment.js for date/time handling
- Portuguese (pt-BR) locale support by default
- UTC timezone for API operations

---

## 📋 Key Dependencies

- `google-auth-library` - OAuth2 & JWT authentication
- `googleapis` - Google APIs client library
- `google-spreadsheet` - Google Sheets API wrapper
- `@google-cloud/firestore` - Firestore database client
- `@google-cloud/pubsub` - Google Cloud Pub/Sub client
- `moment` - Date/time utilities and formatting
- `lodash` - Utility functions for data manipulation
- `collections` - Data structures (Map, Dict, List)
- `async` - Asynchronous utilities
- `sprintf-js` - String formatting

---

## 📞 Support & Maintenance

### Version Information
- **Core Engine:** v0.9.0
- **Node.js:** 14.21.3
- **Angular:** 17.2.3

### Repository
- GitHub: [manasouza/sfin-bills](https://github.com/manasouza/sfin-bills)
- License: ISC
- Author: manasouza

### Common Issues

**Token Expiration Error:**
```
Check token expiration in ~/.credentials/token.json
Re-authenticate via OAuth2 flow
```

**Month Reference Not Found:**
```
Ensure MONTHS_ROW environment variable is set correctly
Check spreadsheet structure matches expected format
```

**No Files Found:**
```
Verify Google Drive authentication
Check file naming convention
Ensure files were modified within current month
```

---

## 🎓 Usage Examples

### Starting the Engine

```bash
cd sfin-bills
npm start
```

The server will start on port 8321 and begin monitoring for files.

### Triggering Bill Processing

1. **Upload a bill file to Google Drive** with standard naming convention
   - Example: `comprovante_condominio_98800.pdf`
   - File must be modified within the current month

2. **Engine automatically detects** the new file via Google Drive API

3. **Category is applied** based on Firestore mappings

4. **Spreadsheet is updated** in the configured Google Sheet
   - Month column is auto-detected
   - Data inserted in the appropriate category row

5. **Logs show processing status**
   - Monitor console output for [INFO], [DEBUG], or [ERROR] messages

---

## 🚦 System Status & Monitoring

The system logs provide visibility into operations:
- `[INFO]` - General information and status
- `[DEBUG]` - Detailed debug information
- `[ERROR]` - Error conditions requiring attention

Monitor logs for:
- File processing status
- Authentication token status
- API call results
- Spreadsheet update operations

---

## 📄 References

https://developers.google.com/workspace/drive/api/guides/search-shareddrives?hl=pt-br

## 📄 License 

ISC License - See repository for details