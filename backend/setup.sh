#!/bin/bash
# Setup script for CodePathfinder backend

echo "🚀 Setting up CodePathfinder backend..."

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env: cp .env.example .env"
echo "  2. Edit .env and add your API keys"
echo "  3. Run the server: python run.py"
