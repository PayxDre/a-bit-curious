#!/usr/bin/env python3
"""Validate the site's JavaScript and structured data.

Runs `node --check` on every script the page loads (app.js, js/*.js, sw.js),
confirms each <script src> in index.html points at a file that exists, and
parses every JSON-LD block. Exits non-zero on any failure so CI fails.
"""
import glob
import json
import os
import re
import subprocess
import sys

HTML_PATH = 'index.html'


def main():
    with open(HTML_PATH, encoding='utf-8') as f:
        content = f.read()

    json_ld = 0
    for attrs, body in re.findall(r'<script([^>]*)>(.*?)</script>', content, re.DOTALL):
        if 'ld+json' in attrs:
            json_ld += 1
            try:
                json.loads(body)
            except json.JSONDecodeError as e:
                print(f'FAIL: JSON-LD block is invalid JSON: {e}')
                return 1

    srcs = re.findall(r'<script[^>]*\ssrc="/([^"]+)"', content)
    if not srcs:
        print('FAIL: index.html loads no scripts')
        return 1
    for src in srcs:
        if not os.path.exists(src):
            print(f'FAIL: index.html references missing script /{src}')
            return 1

    files = sorted(set(srcs) | set(glob.glob('js/*.js')) | ({'sw.js'} if os.path.exists('sw.js') else set()))
    total = 0
    for path in files:
        result = subprocess.run(['node', '--check', path], capture_output=True, text=True)
        if result.returncode != 0:
            print(f'FAIL: JavaScript syntax error in {path}:')
            print(result.stderr)
            return 1
        total += os.path.getsize(path)

    print(f'OK: {len(files)} script file(s) ({total:,} bytes) pass node --check; '
          f'{json_ld} JSON-LD block(s) valid')
    return 0


if __name__ == '__main__':
    sys.exit(main())
