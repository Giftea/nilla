#!/usr/bin/env python3

import os
import sys
from dotenv import load_dotenv

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_status(message, status="info"):
    """Print colored status message"""
    if status == "success":
        print(f"{GREEN}✓{RESET} {message}")
    elif status == "error":
        print(f"{RED}✗{RESET} {message}")
    elif status == "warning":
        print(f"{YELLOW}⚠{RESET} {message}")
    else:
        print(f"{BLUE}ℹ{RESET} {message}")

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 9:
        print_status(f"Python {version.major}.{version.minor}.{version.micro}", "success")
        return True
    else:
        print_status(f"Python {version.major}.{version.minor}.{version.micro} (requires 3.9+)", "error")
        return False

def check_module(module_name, display_name=None):
    """Check if a Python module is installed"""
    if display_name is None:
        display_name = module_name

    try:
        __import__(module_name)
        print_status(f"{display_name} installed", "success")
        return True
    except ImportError:
        print_status(f"{display_name} not found", "error")
        return False

def check_env_var(var_name, required=True):
    """Check if environment variable is set"""
    value = os.getenv(var_name)
    if value:
        # Mask API keys for security
        if "KEY" in var_name or "TOKEN" in var_name:
            masked = value[:8] + "..." if len(value) > 8 else "***"
            print_status(f"{var_name}={masked}", "success")
        else:
            print_status(f"{var_name}={value}", "success")
        return True
    else:
        if required:
            print_status(f"{var_name} not set", "error")
        else:
            print_status(f"{var_name} not set (optional)", "warning")
        return not required

def check_github_connection():
    """Test GitHub API connection"""
    try:
        from github import Github
        token = os.getenv("GITHUB_TOKEN")
        if not token:
            print_status("GitHub token not found, skipping connection test", "warning")
            return False

        g = Github(token)
        user = g.get_user()
        print_status(f"GitHub connected as: {user.login}", "success")
        return True
    except Exception as e:
        print_status(f"GitHub connection failed: {str(e)}", "error")
        return False

def check_anthropic_connection():
    """Test Google Gemini API connection"""
    try:
        from anthropic import Google Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print_status("Google Gemini API key not found, skipping connection test", "warning")
            return False

        client = Google Gemini(api_key=api_key)
        # Simple test call
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=10,
            messages=[{"role": "user", "content": "Hi"}]
        )
        print_status("Google Gemini API connected successfully", "success")
        return True
    except Exception as e:
        print_status(f"Google Gemini connection failed: {str(e)}", "error")
        return False

def check_database():
    """Check database setup"""
    db_path = "codepathfinder.db"
    if os.path.exists(db_path):
        print_status(f"Database found: {db_path}", "success")
    else:
        print_status("Database will be created on first run", "info")
    return True

def main():
    """Run all checks"""
    print("\n" + "=" * 60)
    print("CodePathfinder Setup Verification")
    print("=" * 60 + "\n")

    # Load environment variables
    load_dotenv()

    all_passed = True

    # Check Python version
    print("1️⃣  Python Version:")
    all_passed &= check_python_version()
    print()

    # Check required Python packages
    print("2️⃣  Required Python Packages:")
    packages = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("anthropic", "Google Gemini SDK"),
        ("langgraph", "LangGraph"),
        ("github", "PyGithub"),
        ("opik", "Opik"),
        ("sqlalchemy", "SQLAlchemy"),
        ("pydantic", "Pydantic"),
    ]

    for module, name in packages:
        all_passed &= check_module(module, name)
    print()

    # Check environment variables
    print("3️⃣  Environment Variables:")
    required_vars = [
        ("GOOGLE_API_KEY", True),
        ("GITHUB_TOKEN", True),
    ]
    optional_vars = [
        ("OPIK_API_KEY", False),
        ("OPIK_WORKSPACE", False),
        ("DATABASE_URL", False),
    ]

    for var, required in required_vars + optional_vars:
        all_passed &= check_env_var(var, required)
    print()

    # Test API connections
    print("4️⃣  API Connections:")
    check_anthropic_connection()
    check_github_connection()
    print()

    # Check database
    print("5️⃣  Database:")
    check_database()
    print()

    # Summary
    print("=" * 60)
    if all_passed:
        print_status("All checks passed! You're ready to run CodePathfinder 🚀", "success")
        print()
        print("Next steps:")
        print("  1. Start backend:  cd backend && python run.py")
        print("  2. Start frontend: pnpm dev")
        print("  3. Visit: http://localhost:3000")
    else:
        print_status("Some checks failed. Please fix the issues above.", "error")
        print()
        print("Common fixes:")
        print("  • Missing packages: pip install -r requirements.txt")
        print("  • Missing .env: cp .env.example .env and add your API keys")
        print("  • Invalid API keys: Check your keys at:")
        print("    - Google Gemini: https://aistudio.google.com/apikey")
        print("    - GitHub: https://github.com/settings/tokens")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
