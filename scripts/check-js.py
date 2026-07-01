#!/usr/bin/env python3
"""Extract inline JavaScript from index.html and validate it.

Skips non-JS script blocks (application/ld+json), validates those as JSON
instead. Writes the extracted JS to a temp file and runs node --check on it.
Exits non-zero on any failure so CI fails the build.
"""
import json
import re
import subprocess
import sys
import tempfile

HTML_PATH = 'index.html'


def main():
    with open(HTML_PATH, encoding='utf-8') as f:
        content = f.read()

    blocks = re.findall(r'<script([^>]*)>(.*?)</script>', content, re.DOTALL)
    js_parts = []
    json_ld_count = 0

    for attrs, body in blocks:
        if 'ld+json' in attrs:
            json_ld_count += 1
            try:
                json.loads(body)
            except json.JSONDecodeError as e:
                print(f'FAIL: JSON-LD block is invalid JSON: {e}')
                return 1
        elif 'src=' not in attrs:
            js_parts.append(body)

    if not js_parts:
        print('FAIL: no inline JavaScript found in index.html')
        return 1

    combined = '\n'.join(js_parts)
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as tmp:
        tmp.write(combined)
        tmp_path = tmp.name

    result = subprocess.run(['node', '--check', tmp_path], capture_output=True, text=True)
    if result.returncode != 0:
        print('FAIL: JavaScript syntax error:')
        print(result.stderr)
        return 1

    print(f'OK: {len(js_parts)} JS block(s) ({len(combined):,} chars) pass node --check; '
          f'{json_ld_count} JSON-LD block(s) valid')
    return 0


if __name__ == '__main__':
    sys.exit(main())
