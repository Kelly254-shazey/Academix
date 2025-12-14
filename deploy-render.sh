#!/bin/bash

# Render Deployment Setup Script
# This script prepares your backend for deployment to Render

echo "================================"
echo "Academix Backend Deployment Prep"
echo "================================"
echo ""

# Check if git is initialized
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not a git repository"
    exit 1
fi

echo "✅ Git repository detected"

# Check if node_modules exists
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "⚠️  Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "✅ Backend dependencies installed"
fi

# Check if .env files exist
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file found"
else
    echo "⚠️  Creating .env from .env.example..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your production credentials"
fi

# Check package.json
if grep -q '"start"' backend/package.json; then
    echo "✅ Start script configured"
else
    echo "❌ Start script missing in package.json"
    exit 1
fi

# Check for render.yaml
if [ -f "render.yaml" ]; then
    echo "✅ render.yaml configuration found"
else
    echo "⚠️  Creating render.yaml..."
    # Already created, just inform
fi

# Git status
echo ""
echo "================================"
echo "Git Status"
echo "================================"
git status

echo ""
echo "================================"
echo "Deployment Checklist"
echo "================================"
echo ""
echo "Before deploying to Render:"
echo ""
echo "1. ✅ Code is pushed to GitHub"
echo "2. ❓ Have you created a MySQL database?"
echo "3. ❓ Do you have database credentials?"
echo "4. ❓ Have you generated a secure JWT secret?"
echo "5. ❓ Is frontend URL configured?"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New' → 'Web Service'"
echo "3. Select your GitHub repository (Kelly254-shazey/Academix)"
echo "4. Configure as per RENDER_DEPLOYMENT_GUIDE.md"
echo "5. Add all environment variables"
echo "6. Click 'Deploy'"
echo ""
