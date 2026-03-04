#!/usr/bin/env python3
"""
Verification script to ensure everything is set up correctly
Run this before starting the simulator
"""

import sys
import os

def check_file_structure():
    """Check if all required files exist"""
    print("=" * 60)
    print("Checking File Structure")
    print("=" * 60)
    
    required_files = [
        'pyproject.toml',
        'web_server.py',
        'main.py',
        'virtual_tv.py',
        'ipc_server.py',
        'web_templates/index.html',
        'web_static/js/simulator/main.js',
    ]
    
    all_present = True
    for file in required_files:
        if os.path.exists(file):
            print(f"[OK] {file}")
        else:
            print(f"[MISSING] {file}")
            all_present = False
    
    return all_present

def check_python_syntax():
    """Check Python file syntax"""
    print("\n" + "=" * 60)
    print("Checking Python Syntax")
    print("=" * 60)
    
    python_files = [
        'web_server.py',
        'main.py',
        'virtual_tv.py',
        'ipc_server.py',
    ]
    
    all_valid = True
    for file in python_files:
        if not os.path.exists(file):
            continue
        try:
            with open(file, 'r', encoding='utf-8') as f:
                compile(f.read(), file, 'exec')
            print(f"[OK] {file} - Syntax valid")
        except SyntaxError as e:
            print(f"[ERROR] {file} - Syntax error: {e}")
            all_valid = False
        except Exception as e:
            print(f"[WARNING] {file} - {e}")
    
    return all_valid

def check_poetry_config():
    """Check Poetry configuration"""
    print("\n" + "=" * 60)
    print("Checking Poetry Configuration")
    print("=" * 60)
    
    if not os.path.exists('pyproject.toml'):
        print("[ERROR] pyproject.toml not found")
        return False
    
    with open('pyproject.toml', 'r', encoding='utf-8') as f:
        content = f.read()
    
    required_sections = [
        '[tool.poetry]',
        '[tool.poetry.dependencies]',
        '[tool.poetry.scripts]',
        'flask',
        'flask-socketio',
        'pygame',
    ]
    
    all_present = True
    for section in required_sections:
        if section in content:
            print(f"[OK] Found: {section}")
        else:
            print(f"[MISSING] {section}")
            all_present = False
    
    # Check scripts
    if 'web-server' in content and 'desktop-simulator' in content:
        print("[OK] Poetry scripts configured")
    else:
        print("[WARNING] Poetry scripts may be missing")
    
    return all_present

def check_web_files():
    """Check web files"""
    print("\n" + "=" * 60)
    print("Checking Web Files")
    print("=" * 60)
    
    html_file = 'web_templates/index.html'
    js_file = 'web_static/js/simulator/main.js'
    
    all_ok = True
    
    if os.path.exists(html_file):
        with open(html_file, 'r', encoding='utf-8') as f:
            html = f.read()
        if 'three.js' in html.lower() and 'socket.io' in html.lower():
            print("[OK] index.html - Has required libraries")
        else:
            print("[WARNING] index.html - Missing some libraries")
            all_ok = False
    else:
        print(f"[ERROR] {html_file} not found")
        all_ok = False
    
    if os.path.exists(js_file):
        with open(js_file, 'r', encoding='utf-8') as f:
            js = f.read()
        if 'function animate' in js and 'initScene' in js:
            print(f"[OK] {js_file} - animation loop and init entry")
        else:
            print(f"[WARNING] {js_file} - missing animate or initScene reference")
            all_ok = False
    else:
        print(f"[ERROR] {js_file} not found")
        all_ok = False
    
    return all_ok

def check_main_functions():
    """Check that main functions exist"""
    print("\n" + "=" * 60)
    print("Checking Entry Points")
    print("=" * 60)
    
    web_server_file = 'web_server.py'
    main_file = 'main.py'
    
    all_ok = True
    
    if os.path.exists(web_server_file):
        with open(web_server_file, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'def main():' in content and '__name__' in content:
            print("[OK] web_server.py - Has main() function")
        else:
            print("[ERROR] web_server.py - Missing main() function")
            all_ok = False
    
    if os.path.exists(main_file):
        with open(main_file, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'def main():' in content and '__name__' in content:
            print("[OK] main.py - Has main() function")
        else:
            print("[ERROR] main.py - Missing main() function")
            all_ok = False
    
    return all_ok

def main():
    """Run all checks"""
    print("\n" + "=" * 60)
    print("  Virtual TV Simulator - Setup Verification")
    print("=" * 60)
    print()
    
    # Change to test_simulator directory if needed
    if os.path.exists('test_simulator'):
        os.chdir('test_simulator')
    elif not os.path.exists('pyproject.toml'):
        print("[ERROR] Please run this from project root or test_simulator directory")
        return 1
    
    results = []
    results.append(("File Structure", check_file_structure()))
    results.append(("Python Syntax", check_python_syntax()))
    results.append(("Poetry Config", check_poetry_config()))
    results.append(("Web Files", check_web_files()))
    results.append(("Entry Points", check_main_functions()))
    
    # Summary
    print("\n" + "=" * 60)
    print("  Verification Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n[SUCCESS] Everything looks good!")
        print("\nNext steps:")
        print("1. Install Poetry (if not installed):")
        print("   curl -sSL https://install.python-poetry.org | python3 -")
        print("   export PATH=\"$HOME/.local/bin:$PATH\"")
        print("\n2. Install dependencies:")
        print("   poetry install")
        print("\n3. Run the simulator:")
        print("   poetry run web-server")
        print("   # Then open http://localhost:5000")
        return 0
    else:
        print(f"\n[WARNING] {total - passed} check(s) failed.")
        print("Please fix the issues above before running the simulator.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

