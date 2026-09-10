#!/usr/bin/env python3
"""Record or verify the three documents and Godot data in one Pages release."""
import argparse
import hashlib
import json
from pathlib import Path
import time
import urllib.request

FILES = ('index.html', 'classic/index.html', 'seed/index.html', 'seed/index.pck', 'seed/boot.js')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['record', 'check'])
    parser.add_argument('--commit', required=True)
    parser.add_argument('--url')
    args = parser.parse_args()
    if args.command == 'record':
        release = {'commit': args.commit, 'files': {name: sha((Path('dist') / name).read_bytes()) for name in FILES}}
        Path('dist/release.json').write_text(json.dumps(release, indent=2) + '\n')
        print(f'Recorded chooser, classic game, and Godot export for {args.commit}')
        return
    if not args.url:
        parser.error('--url is required when checking a deployment')
    base = args.url.rstrip('/') + '/'
    def fetch(name, attempt):
        request = urllib.request.Request(base + name + f'?release={args.commit}&attempt={attempt}', headers={'Cache-Control': 'no-cache'})
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read()
    for attempt in range(1, 13):
        try:
            release = json.loads(fetch('release.json', attempt))
            if release['commit'] != args.commit:
                raise ValueError('CDN is still serving a different release')
            for name in FILES:
                if sha(fetch(name, attempt)) != release['files'][name]:
                    raise ValueError(f'{name} does not match the release manifest')
            # The engine binary is large. Verify availability without running it
            # or downloading it in full: WASM binaries begin with \0asm.
            with urllib.request.urlopen(base + 'seed/index.wasm', timeout=30) as response:
                if response.read(4) != b'\x00asm':
                    raise ValueError('Godot WebAssembly file is missing or invalid')
            print(f'Verified {base}: chooser, classic game, Godot page/data, and WASM availability at {args.commit}')
            return
        except (OSError, ValueError, KeyError) as error:
            print(f'Attempt {attempt}: {error}', flush=True)
            if attempt < 12:
                time.sleep(20)
    raise SystemExit('Pages did not serve the complete expected release')


if __name__ == '__main__':
    main()
