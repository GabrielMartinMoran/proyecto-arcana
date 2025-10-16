#!/bin/bash
# Setup script for ARCANA Combat Encounter Simulator

set -e

echo "=========================================="
echo "ARCANA Combat Encounter Simulator Setup"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Found Python $PYTHON_VERSION"
echo ""

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip --quiet
echo "✓ pip upgraded"
echo ""

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt --quiet
echo "✓ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠ Warning: .env file not found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠ IMPORTANT: Edit .env file with your OpenAI API key"
    echo ""
fi

echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Activate the virtual environment:"
echo "   source .venv/bin/activate"
echo ""
echo "2. Configure your OpenAI API key in .env file"
echo ""
echo "3. Run a simulation:"
echo "   python app.py"
echo ""
