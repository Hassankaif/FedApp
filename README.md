# Privacy-Preserving Federated Learning System for Chronic Disease Risk Prediction

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-orange)](https://www.tensorflow.org/)
[![Flower](https://img.shields.io/badge/Flower-1.7.0-green)](https://flower.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A production-ready federated learning system enabling multiple hospitals to collaboratively train machine learning models for disease prediction without sharing sensitive patient data.**

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Key Features](#key-features)
5. [Technology Stack](#technology-stack)
6. [System Requirements](#system-requirements)
7. [Installation](#installation)
8. [Project Structure](#project-structure)
9. [Configuration](#configuration)
10. [Usage Guide](#usage-guide)
11. [API Documentation](#api-documentation)
12. [Federated Learning Process](#federated-learning-process)
13. [Security & Privacy](#security--privacy)
14. [Performance Evaluation](#performance-evaluation)
15. [Troubleshooting](#troubleshooting)
16. [Contributing](#contributing)
17. [Future Enhancements](#future-enhancements)
18. [License](#license)
19. [Acknowledgments](#acknowledgments)

---

## 📖 Overview

This project implements a **cross-silo federated learning system** where multiple healthcare institutions (hospitals) can collaboratively train a machine learning model for chronic disease risk prediction while maintaining complete data privacy. The system uses the **Federated Averaging (FedAvg)** algorithm and provides a comprehensive web-based dashboard for monitoring, configuration, and model management.

### What is Federated Learning?

Federated Learning (FL) is a machine learning approach that enables training models across decentralized data sources without exchanging raw data. Instead of centralizing patient data (which raises privacy concerns), each hospital:

1. Trains a model locally on their own data
2. Shares only model updates (weights) with a central server
3. Receives an improved global model aggregated from all participants

### Why This Project Matters

- **Privacy**: Patient data never leaves hospital premises, complying with HIPAA, GDPR, and other regulations
- **Collaboration**: Smaller hospitals benefit from larger datasets without data sharing
- **Performance**: Achieves competitive accuracy compared to centralized training
- **Scalability**: Easily extends to N participating hospitals
- **Production-Ready**: Includes monitoring, versioning, and deployment capabilities

---

## 🎯 Problem Statement

### Healthcare Data Challenges

1. **Data Silos**: Healthcare institutions possess valuable patient data that cannot be centralized due to:
   - Privacy regulations (HIPAA, GDPR)
   - Institutional policies
   - Patient consent limitations
   - Security concerns

2. **Limited Dataset Size**: Individual hospitals may have insufficient data for robust ML model training

3. **Data Heterogeneity**: Different hospitals have varying:
   - Patient demographics
   - Disease prevalence
   - Equipment and procedures
   - Data collection methods (Non-IID data)

4. **Collaboration Barriers**: Traditional ML requires data centralization, which is:
   - Legally problematic
   - Technically challenging
   - Privacy-invasive
   - Expensive to implement

### Research Gap

Existing solutions often:
- Lack production-ready implementations
- Don't provide real-time monitoring
- Miss model versioning and comparison features
- Require complex setup and maintenance

---

## 🏗️ Solution Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Web Dashboard                       │
│        (React + Vite + Recharts + WebSocket)                │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │Dashboard │Comparison│  Config  │  Models  │             │
│  └──────────┴──────────┴──────────┴──────────┘             │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Orchestrator (FastAPI)                  │
│  • Authentication (JWT)                                      │
│  • Training Coordination                                     │
│  • Metrics Storage (MySQL)                                   │
│  • Model Registry                                            │
│  • Configuration Management                                  │
└────────────────────────┬────────────────────────────────────┘
                         │ gRPC (Flower Protocol)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        Federated Learning Server (Flower + FedAvg)          │
│  • Client Coordination                                       │
│  • Model Aggregation                                         │
│  • Round Management                                          │
│  • Global Model Storage                                      │
└────────────┬────────────┬────────────┬───────────────────────┘
             │            │            │
             ▼            ▼            ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │FL Client A │ │FL Client B │ │FL Client C │
    │Hospital A  │ │Hospital B  │ │Hospital C  │
    │TensorFlow  │ │TensorFlow  │ │TensorFlow  │
    │Local Data  │ │Local Data  │ │Local Data  │
    └────────────┘ └────────────┘ └────────────┘
```

### Component Interaction Flow

```
1. Admin logs into dashboard
2. Admin configures training parameters (mode, rounds, etc.)
3. FL clients connect to FL server
4. FL server coordinates training rounds:
   a. Sends global model to clients
   b. Clients train locally
   c. Clients send updates back
   d. Server aggregates updates (FedAvg)
   e. Repeat for N rounds
5. FL server reports metrics to backend
6. Backend broadcasts updates via WebSocket
7. Dashboard updates in real-time
8. Admin can:
   - Download trained models
   - Run centralized comparison
   - Configure new models
   - Manage datasets
```

---

## ✨ Key Features

### Core Features

#### 1. Federated Learning Training
- **Algorithm**: Federated Averaging (FedAvg)
- **Clients**: 3 independent hospital nodes
- **Rounds**: Configurable (default: 20)
- **Local Epochs**: 5 per round
- **Privacy**: Zero raw data sharing

#### 2. Real-Time Monitoring Dashboard
- **WebSocket Integration**: Live updates during training
- **Metrics Visualization**:
  - Accuracy vs Round (Line Chart)
  - Loss vs Round (Line Chart)
  - Client Participation (Bar Chart)
- **Client Status**: Online/Offline indicators
- **Progress Tracking**: Round counter and percentage bar

#### 3. Training Mode Selection
- **Federated Only**: Standard FL training
- **Comparison Mode**: FL + Centralized comparison
- **Admin Control**: Web-based mode selector
- **Automated Workflow**: Seamless switching between modes

#### 4. Centralized Training & Comparison
- **Upload Dataset**: Admin uploads combined hospital data
- **Train Centralized**: Runs on admin machine (100 epochs)
- **Performance Comparison**:
  - Side-by-side accuracy
  - Side-by-side loss
  - Performance difference metrics
- **Visual Comparison**: Dedicated comparison tab

#### 5. Model Save & Download
- **Server-Side Saving**: Automatic after training completion
- **Client-Side Download**: Optional `--download-model` flag
- **Admin Downloads**:
  - Global Model (Federated) - `.pkl` format
  - Centralized Model - `.h5` format
- **Model Versioning**: Timestamped storage

#### 6. Dynamic Model Configuration
- **Web-Based Editor**: Write TensorFlow/Keras code in browser
- **Model Architecture**: Fully customizable
- **Save & Apply**: Configuration stored in MySQL
- **No Code Deployment**: Changes applied without redeploying

#### 7. Dataset Management
- **Upload Interface**: Drag-and-drop CSV files
- **Dataset Validation**: Automatic shape and format checking
- **Dataset Library**: View all uploaded datasets
- **Statistics**: Rows, columns, size, creation date

#### 8. Authentication & Authorization
- **JWT-based**: Secure token authentication
- **Session Management**: Persistent login
- **Admin-Only Features**: Protected endpoints
- **Logout**: Clean session termination

#### 9. Database Integration
- **MySQL**: Production-grade database
- **Async Operations**: Non-blocking database queries
- **Real-Time Storage**: Metrics saved during training
- **Foreign Keys**: Relational integrity
- **Indexing**: Optimized queries

#### 10. Multi-Laptop Deployment
- **Network Discovery**: Automatic IP configuration
- **gRPC Communication**: Efficient binary protocol
- **Fault Tolerance**: Handles client disconnections
- **Scalability**: Supports N clients

---

## 🛠️ Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.8+ | Core programming language |
| **FastAPI** | 0.109.0 | RESTful API framework |
| **Flower** | 1.7.0 | Federated learning framework |
| **TensorFlow** | 2.16.1 | Deep learning framework |
| **aiomysql** | 0.2.0 | Async MySQL driver |
| **PyJWT** | 2.8.0 | JWT authentication |
| **Uvicorn** | 0.27.0 | ASGI server |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI framework |
| **Vite** | 5.0.8 | Build tool |
| **Recharts** | 2.10.3 | Chart library |
| **Tailwind CSS** | 3.4.0 | Styling framework |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| **MySQL** | 8.0+ | Relational database |

### Communication

| Technology | Version | Purpose |
|------------|---------|---------|
| **gRPC** | 1.60.0 | Client-server communication |
| **WebSocket** | 12.0 | Real-time dashboard updates |
| **HTTP/REST** | - | API endpoints |

### Machine Learning

| Library | Purpose |
|---------|---------|
| **NumPy** | Numerical computations |
| **Pandas** | Data manipulation |
| **scikit-learn** | Data preprocessing |

---

## 💻 System Requirements

### Minimum Requirements (Single Machine Testing)

- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **CPU**: Intel i5 or equivalent (4 cores)
- **RAM**: 8 GB
- **Storage**: 5 GB free space
- **Network**: Localhost (127.0.0.1)
- **Python**: 3.8 or higher
- **Node.js**: 16.0 or higher
- **MySQL**: 8.0 or higher

### Recommended Requirements (Multi-Laptop Deployment)

- **Machines**: 4 (1 server + 3 clients)
- **OS**: Ubuntu 22.04 LTS or Windows 11
- **CPU**: Intel i7 or equivalent (8 cores)
- **RAM**: 16 GB per machine
- **Storage**: 10 GB free space per machine
- **Network**: 
  - LAN: 1 Gbps Ethernet
  - WiFi: 802.11ac (5 GHz)
  - Firewall: Ports 8000, 8080 open

### Software Dependencies

```bash
# Backend
Python 3.8+
pip 21.0+
MySQL 8.0+

# Frontend
Node.js 16.0+
npm 8.0+
```

---

## 📥 Installation

### Prerequisites

1. **Install Python 3.8+**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3.8 python3-pip python3-venv
   
   # macOS (using Homebrew)
   brew install python@3.8
   
   # Windows
   # Download from https://www.python.org/downloads/
   ```

2. **Install Node.js 16+**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # macOS (using Homebrew)
   brew install node
   
   # Windows
   # Download from https://nodejs.org/
   ```

3. **Install MySQL 8.0+**
   ```bash
   # Ubuntu/Debian
   sudo apt install mysql-server
   sudo mysql_secure_installation
   
   # macOS
   brew install mysql
   brew services start mysql
   
   # Windows
   # Download from https://dev.mysql.com/downloads/installer/
   ```

### Step-by-Step Installation

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/federated-learning-healthcare.git
cd federated-learning-healthcare
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE FederatedLearning;

# Create user (optional, for production)
CREATE USER 'fl_admin'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON FederatedLearning.* TO 'fl_admin'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
exit;
```

#### 4. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Build for production (optional)
npm run build
```

#### 5. FL Server Setup

```bash
cd ../fl-server
# Uses same virtual environment as backend
```

#### 6. FL Client Setup

```bash
cd ../fl-client
# Uses same virtual environment as backend
```

#### 7. Data Preparation

```bash
# Create data directory
mkdir -p fl-client/data

# Generate sample datasets
python scripts/generate_data.py

# This creates:
# - fl-client/data/hospital_a.csv
# - fl-client/data/hospital_b.csv
# - fl-client/data/hospital_c.csv
```

---

## 📁 Project Structure

```
federated-learning-healthcare/
│
├── README.md                          # This file
├── LICENSE                            # MIT License
├── .gitignore                         # Git ignore rules
│
├── backend/                           # Backend API
│   ├── main.py                        # FastAPI application
│   ├── requirements.txt               # Python dependencies
│   ├── .env                           # Environment variables (gitignored)
│   ├── models/                        # Saved models directory
│   ├── datasets/                      # Uploaded datasets directory
│   └── configs/                       # Model configurations directory
│
├── fl-server/                         # Federated Learning Server
│   ├── server.py                      # Flower FL server
│   └── config.yaml                    # Server configuration
│
├── fl-client/                         # Federated Learning Clients
│   ├── client.py                      # Flower FL client
│   ├── config.yaml                    # Client configuration
│   ├── data/                          # Local hospital data
│   │   ├── hospital_a.csv
│   │   ├── hospital_b.csv
│   │   └── hospital_c.csv
│   └── client_models/                 # Downloaded models
│       ├── hospital_a/
│       ├── hospital_b/
│       └── hospital_c/
│
├── frontend/                          # React Dashboard
│   ├── src/
│   │   ├── App.jsx                    # Main application component
│   │   ├── main.jsx                   # Entry point
│   │   ├── index.css                  # Global styles
│   │   └── assets/                    # Static assets
│   ├── public/
│   ├── index.html                     # HTML template
│   ├── package.json                   # Node dependencies
│   ├── vite.config.js                 # Vite configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   └── postcss.config.js              # PostCSS config
│
├── scripts/                           # Utility scripts
│   ├── generate_data.py               # Generate sample datasets
│   ├── merge_datasets.py              # Merge for centralized training
│   └── setup.sh                       # Automated setup script
│
├── docs/                              # Additional documentation
│   ├── API.md                         # API documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   ├── ARCHITECTURE.md                # Architecture details
│   └── TROUBLESHOOTING.md             # Common issues
│
└── tests/                             # Test suite
    ├── test_backend.py
    ├── test_fl_server.py
    ├── test_fl_client.py
    └── test_integration.py
```

---

## ⚙️ Configuration

### Backend Configuration

Edit `backend/.env`:

```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=FederatedLearning

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

### FL Server Configuration

Edit `fl-server/config.yaml`:

```yaml
server:
  address: "0.0.0.0:8080"
  num_rounds: 20
  
strategy:
  name: "FedAvg"
  fraction_fit: 1.0
  fraction_evaluate: 1.0
  min_fit_clients: 3
  min_evaluate_clients: 3
  min_available_clients: 3

backend:
  url: "http://localhost:8000"
```

### FL Client Configuration

Edit `fl-client/config.yaml`:

```yaml
server:
  address: "localhost:8080"

client:
  local_epochs: 5
  batch_size: 32
  learning_rate: 0.001

data:
  validation_split: 0.1
  shuffle: true
```

### Frontend Configuration

Edit `frontend/src/App.jsx`:

```javascript
const API_BASE = 'http://localhost:8000';  // Backend URL
const WS_URL = 'ws://localhost:8000/ws';   // WebSocket URL
```

For production:

```javascript
const API_BASE = 'https://your-backend.com';
const WS_URL = 'wss://your-backend.com/ws';
```

---

## 🚀 Usage Guide

### Quick Start (Single Machine)

#### Terminal 1: Start Backend

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
```

**Expected Output:**
```
✓ Database initialized and connected via aiomysql
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 2: Start FL Server

```bash
cd fl-server
source venv/bin/activate
python server.py
```

**Expected Output:**
```
✓ Notified backend: Training starting
==================================================
🚀 Federated Learning Server Starting
==================================================
Configuration:
  - Min clients: 3
  - Strategy: FedAvg
  - Server address: 0.0.0.0:8080
  - Backend API: http://localhost:8000
  - Model saving: Enabled
==================================================

INFO flower 2024-01-15 10:00:00,000 | app.py:163 | Starting Flower server, config: ...
```

#### Terminal 3-5: Start FL Clients

```bash
# Terminal 3: Hospital A
cd fl-client
source venv/bin/activate
python client.py --client-id hospital_a --data-path data/hospital_a.csv --download-model
```

```bash
# Terminal 4: Hospital B
python client.py --client-id hospital_b --data-path data/hospital_b.csv --download-model
```

```bash
# Terminal 5: Hospital C
python client.py --client-id hospital_c --data-path data/hospital_c.csv --download-model
```

**Expected Output (per client):**
```
============================================================
🏥 Federated Learning Client: hospital_a
============================================================
Loading data from data/hospital_a.csv...
✓ Data loaded: 142 train, 36 test samples
Creating local model...
Connecting to FL server at localhost:8080...
============================================================

✓ Registered with backend
```

#### Terminal 6: Start Frontend

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Multi-Laptop Deployment

#### Server Machine (Laptop 1)

**Find Your IP Address:**
```bash
# Linux/macOS
ifconfig | grep "inet "

# Windows
ipconfig
```

Example output: `192.168.1.100`

**Start Backend & FL Server:**
```bash
# Terminal 1: Backend
python backend/main.py

# Terminal 2: FL Server
python fl-server/server.py

# Terminal 3: Frontend
cd frontend && npm run dev
```

#### Client Machines (Laptops 2, 3, 4)

**Update Client Configuration:**

Edit `fl-client/config.yaml`:
```yaml
server:
  address: "192.168.1.100:8080"  # Server's IP
```

**Start Client:**
```bash
cd fl-client
python client.py --client-id hospital_a --data-path data/hospital_a.csv --server 192.168.1.100:8080 --download-model
```

### Dashboard Usage

#### 1. Login

1. Open browser: `http://localhost:3000`
2. Enter credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Login"

#### 2. Dashboard Tab

**Monitor Training:**
- View client status (Online/Offline)
- Select training mode (Federated / Comparison)
- Start training when 3 clients are online
- Watch real-time metrics:
  - Current round
  - Accuracy progress
  - Loss convergence
  - Client participation

**Training Controls:**
1. Select mode from dropdown
2. Wait for "3/3 ✓" clients
3. Click "🚀 Start Training"
4. Monitor progress bar (0% → 100%)
5. View live charts updating

#### 3. Comparison Tab

**Run Centralized Training:**
1. Wait for FL training to complete
2. Navigate to "Comparison" tab
3. Upload combined dataset:
   ```bash
   # First, merge datasets
   python scripts/merge_datasets.py
   ```
4. Click "Choose File" → select `combined_dataset.csv`
5. Click "🚀 Run Centralized Training"
6. Wait for completion (~1-2 minutes)
7. View comparison results:
   - Federated accuracy vs Centralized accuracy
   - Loss comparison
   - Performance difference

**Interpreting Results:**
```
Federated Learning:     78.5% accuracy, 0.45 loss
Centralized Learning:   82.3% accuracy, 0.38 loss
Difference:             +3.8% accuracy (centralized better)

Explanation: Centralized has access to ALL data,
so it typically performs 2-5% better than federated.
The small gap shows FL is effective!
```

#### 4. Config Tab

**Change Model Architecture:**
1. Navigate to "Config" tab
2. Paste TensorFlow/Keras code:
   ```python
   model = tf.keras.Sequential([
       tf.keras.layers.Dense(128, activation='relu', input_shape=(input_shape,)),
       tf.keras.layers.Dropout(0.3),
       tf.keras.layers.Dense(64, activation='relu'),
       tf.keras.layers.Dropout(0.3),
       tf.keras.layers.Dense(32, activation='relu'),
       tf.keras.layers.Dense(1, activation='sigmoid')
   ])
   
   model.compile(
       optimizer='adam',
       loss='binary_crossentropy',
       metrics=['accuracy']
   )
   ```
3. Click "💾 Save Model Configuration"
4. Restart FL server to apply changes

**Upload New Dataset:**
1. Prepare CSV file with:
   - Features in columns (numeric)
   - Target in last column (0 or 1)
2. Click "Choose File"
3. Select your CSV
4. Click "📤 Upload Dataset"
5. View confirmation with dataset statistics

#### 5. Models Tab

**Download Trained Models:**
1. Navigate to "Models" tab
2. Click "⬇️ Download Global Model" (Federated)
   - Format: `.pkl` (pickle file)
   - Contains: Model weights as NumPy arrays
3. Click "⬇️ Download Centralized Model"
   - Format: `.h5` (Keras HDF5 file)
   - Contains: Complete Keras model

**View Model History:**
- See all saved models
- Check creation timestamps
- View file sizes
- Identify model types (global/centralized)

---

## 📡 API Documentation

### Authentication Endpoints

#### `POST /api/auth/login`

Login to the system.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Status Codes:**
- `200`: Success
- `401`: Invalid credentials

---

### Training Endpoints

#### `POST /api/training/start`

Start a new federated training session.

**Response:**
```json
{
  "status": "started",
  "session_id": 42
}
```

#### `POST /api/training/complete`

Mark training session as complete.

**Response:**
```json
{
  "status": "completed"
}
```

#### `GET /api/training/status`

Get current training status.

**Response:**
```json
{
  "is_training": true,
  "session_id": 42,
  "current_round": 15,
  "total_rounds": 20,
  "started_at": "2024-01-15T10:00:00"
}
```

#### `POST /api/training/mode`

Set training mode.

**Request:**
```json
{
  "mode": "comparison",
  "dataset_file": "combined.csv"
}
```

**Response:**
```json
{
  "status": "success",
  "mode": "comparison",
  "message": "Training mode set to comparison"
}
```

#### `POST /api/training/centralized`

Run centralized training.

**Request:** `multipart/form-data`
- `dataset_file`: CSV file

**Response:**
```json
{
  "status": "success",
  "accuracy": 0.823,
  "loss": 0.38,
  "training_time": 45.2,
  "model_path": "models/centralized_1234567890.h5"
}
```

#### `GET /api/training/comparison`

Get comparison results.

**Response:**
```json
{
  "federated": {
    "accuracy": 0.785,
    "loss": 0.45
  },
  "centralized": {
    "accuracy": 0.823,
    "loss": 0.38,
    "training_time": 45.2
  },
  "comparison": {
    "accuracy_diff": 0.038,
    "loss_diff": -0.07
  }
}
```

---

### Metrics Endpoints

#### `POST /api/training/metrics`

Report training metrics (called by FL server).

**Request:**
```json
{
  "round": 15,
  "num_clients": 3,
  "accuracy": 0.78,
  "loss": 0.45,
  "client_metrics": {
    "client_0": {"accuracy": 0.77, "loss": 0.46},
    "client_1": {"accuracy": 0.79, "loss": 0.44},
    "client_2": {"accuracy": 0.78, "loss": 0.45}
  },
  "timestamp": "2024-01-15T10:30:00"
}
```

**Response:**
```json
{
  "status": "received"
}
```

#### `GET /api/metrics`

Get all training metrics.

**Query Parameters:**
- `session_id` (optional): Filter by session

**Response:**
```json
{
  "metrics": [
    {
      "round": 1,
      "accuracy": 0.65,
      "loss": 0.58,
      "num_clients": 3,
      "timestamp": "2024-01-15T10:05:00"
    },
    {
      "round": 2,
      "accuracy": 0.68,
      "loss": 0.55,
      "num_clients": 3,
      "timestamp": "2024-01-15T10:06:30"
    }
  ]
}
```

#### `GET /api/metrics/latest`

Get metrics for the latest session.

**Response:** Same format as `/api/metrics`

---

### Client Endpoints

#### `POST /api/clients/register`

Register a new FL client.

**Request:**
```json
{
  "client_id": "hospital_a",
  "total_samples": 178
}
```

**Response:**
```json
{
  "status": "registered"
}
```

#### `GET /api/clients`

Get all registered clients.

**Response:**
```json
{
  "clients": [
    {
      "client_id": "hospital_a",
      "status": "online",
      "last_seen": "2024-01-15T10:30:00",
      "total_samples": 178
    },
    {
      "client_id": "hospital_b",
      "status": "online",
      "last_seen": "2024-01-15T10:30:00",
      "total_samples": 165
    }
  ]
}
```

---

### Model Endpoints