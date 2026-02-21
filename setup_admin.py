#!/usr/bin/env python3
"""
Setup script to create the base quizmaster account.
"""
import sys
from pathlib import Path

# Import auth utils directly so we don't pull in the Flask app (app/__init__.py requires Flask).
# Add the app/ package directory so we can do "from utils.auth import ..." without loading app/__init__.py.
sys.path.insert(0, str(Path(__file__).parent / 'app'))

from utils.auth import create_account_direct

def main():
    """Create the base quizmaster account if it does not exist. If it already exists, do nothing (do not reset password)."""
    username = 'quizmaster'
    password = 'masterquiz'

    result = create_account_direct(username, password)

    if result['success']:
        print(f"✓ Created quizmaster account: {username} (password: {password})")
    elif result.get('error', '').lower().find('already exists') >= 0:
        print(f"✓ Quizmaster account '{username}' already exists; leaving password unchanged.")
    else:
        print(f"✗ Error: {result.get('error', 'unknown')}")
        sys.exit(1)

if __name__ == '__main__':
    main()



