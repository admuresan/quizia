#!/usr/bin/env python3
"""
Setup script to create the base quizmaster account.
"""
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.utils.auth import create_account_direct

def main():
    """Create the base quizmaster account."""
    username = 'quizmaster'
    password = 'masterquiz'
    
    print(f"Creating quizmaster account: {username}...")
    result = create_account_direct(username, password)
    
    if result['success']:
        print(f"✓ Successfully created quizmaster account: {username}")
        print(f"  Username: {username}")
        print(f"  Password: {password}")
    else:
        print(f"✗ Error: {result['error']}")
        if 'already exists' in result['error'].lower():
            print("  Account already exists. You can use it to log in.")
        sys.exit(1)

if __name__ == '__main__':
    main()


