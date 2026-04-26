#!/bin/bash

set -e

echo "🚀 Setting up Transcendence project environment..."

# -----------------------------
# FUNCTION: check command
# -----------------------------
command_exists () {
    command -v "$1" >/dev/null 2>&1
}

# -----------------------------
# 1. SYSTEM DEPENDENCIES
# -----------------------------
echo "📦 Checking system dependencies..."

sudo apt update

if ! command_exists python3; then
    echo "🐍 Installing python3..."
    sudo apt install -y python3
fi

if ! command_exists pip3; then
    echo "📦 Installing pip3..."
    sudo apt install -y python3-pip
fi

if ! command_exists python3-venv; then
    echo "📦 Installing venv..."
    sudo apt install -y python3-venv python3-full
fi

# -----------------------------
# 2. NODE + NPM CHECK
# -----------------------------
echo "📦 Checking Node.js..."

if ! command_exists node; then
    echo "❌ Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js already installed"
fi

if ! command_exists npm; then
    echo "❌ npm not found, installing..."
    sudo apt install -y npm
else
    echo "✅ npm already installed"
fi

# -----------------------------
# 3. BACKEND VENV
# -----------------------------
echo "🐍 Setting up backend virtual environment..."

if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
    echo "✅ venv created"
else
    echo "✅ venv already exists"
fi

source backend/venv/bin/activate

pip install --upgrade pip

# -----------------------------
# 4. BACKEND DEPENDENCIES
# -----------------------------
echo "📥 Installing backend requirements..."

for req in \
    backend/services/auth_service/requirements.txt \
    backend/services/chat_service/requirements.txt \
    backend/services/org_service/requirements.txt
do
    if [ -f "$req" ]; then
        pip install -r "$req"
    fi
done

# -----------------------------
# 5. PYTHON EXTRA PACKAGES
# -----------------------------
echo "📦 Installing Python extra packages..."

pip install supabase requests python-dotenv websocket-client

# -----------------------------
# 6. FRONTEND
# -----------------------------
echo "📦 Installing frontend dependencies..."

if [ -d "frontend" ]; then
    cd frontend

    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "✅ node_modules already exists"
    fi

    cd ..
fi

# -----------------------------
# DONE
# -----------------------------
echo "✅ Setup complete!"
echo "👉 Activate backend venv with:"
echo "source backend/venv/bin/activate"
