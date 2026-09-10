#!/usr/bin/env python3
"""Pinned, reproducible Godot prototype tools. No npm runtime dependencies."""
import argparse
import hashlib
import http.server
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / 'godot'
OUTPUT = ROOT / 'build' / 'godot'
VERSION = '4.7.2'
CACHE = Path.home() / '.cache' / 'universal-ai' / 'godot' / VERSION
TEMPLATES = Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share'))) / 'godot/export_templates' / f'{VERSION}.stable'
BASE = f'https://github.com/godotengine/godot/releases/download/{VERSION}-stable/'
EDITOR = f'Godot_v{VERSION}-stable_linux.x86_64'
DIGESTS = {
    f'{EDITOR}.zip': 'cadd3204e728a35d3f13adb7fd0d7902636b79f6b95c40c265eb73b6c35329e4',
    f'Godot_v{VERSION}-stable_export_templates.tpz': 'f298490b8d44d934be425a5a65a51bf15f422428b229a06a6e11d9ffea248011',
}


def download(name):
    CACHE.mkdir(parents=True, exist_ok=True)
    archive = CACHE / name
    if not archive.exists():
        print(f'Downloading {name} from the official Godot release…', flush=True)
        temp = archive.with_suffix('.part')
        urllib.request.urlretrieve(BASE + name, temp)
        temp.replace(archive)
    with archive.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    if digest != DIGESTS[name]:
        raise RuntimeError(f'Checksum mismatch: {archive}. Remove this download and retry.')
    return archive


def executable():
    supplied = os.environ.get('GODOT_BIN') or shutil.which('godot') or shutil.which('godot4')
    if supplied:
        return supplied
    binary = CACHE / EDITOR
    if not binary.exists():
        if platform.system() != 'Linux' or platform.machine() not in ('x86_64', 'AMD64'):
            raise RuntimeError('Install Godot 4.7.2 and set GODOT_BIN to its executable on this platform.')
        with zipfile.ZipFile(download(f'{EDITOR}.zip')) as archive:
            binary.write_bytes(archive.read(EDITOR))
        binary.chmod(0o755)
    return str(binary)


def setup_templates():
    required = ['web_nothreads_debug.zip', 'web_nothreads_release.zip']
    if all((TEMPLATES / file).exists() for file in required):
        return
    archive = download(f'Godot_v{VERSION}-stable_export_templates.tpz')
    TEMPLATES.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as bundle:
        for file in [*required, 'version.txt']:
            (TEMPLATES / file).write_bytes(bundle.read(f'templates/{file}'))
    # The upstream bundle contains every platform. Only keep the web templates.
    archive.unlink()


def engine(*args):
    result = subprocess.run([executable(), '--headless', '--path', str(PROJECT), *args], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(result.stdout, end='')
    # Godot's editor can exit zero despite a GDScript parser error.
    if result.returncode or 'SCRIPT ERROR:' in result.stdout or '\nERROR:' in result.stdout:
        raise RuntimeError('Godot reported an import, script, or export error.')


def build():
    setup_templates()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    engine('--editor', '--import', '--quit')
    engine('--export-release', 'Web', str(OUTPUT / 'index.html'))
    shutil.copy2(PROJECT / 'web/boot.js', OUTPUT / 'boot.js')
    shutil.copytree(PROJECT / 'licenses', OUTPUT / 'licenses', dirs_exist_ok=True)
    print(f'Browser build: {OUTPUT}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['setup', 'build', 'test', 'serve', 'stage', 'editor'])
    parser.add_argument('--port', type=int, default=4180)
    args = parser.parse_args()
    if args.command == 'setup':
        print(executable())
        setup_templates()
    elif args.command == 'build':
        build()
    elif args.command == 'test':
        engine('--editor', '--import', '--quit')
        engine('--script', 'res://tests/test_simulation.gd')
        engine('--quit-after', '10', '--', '--test')
        engine('--quit-after', '10', '--', '--test', '--chorus')
    elif args.command == 'editor':
        subprocess.run([executable(), '--editor', '--path', str(PROJECT)], check=True)
    elif args.command == 'stage':
        if not (OUTPUT / 'index.html').exists():
            build()
        destination = ROOT / 'dist' / 'seed'
        shutil.copytree(OUTPUT, destination, dirs_exist_ok=True)
        print(f'GitHub Pages artifact: {destination}')
    elif args.command == 'serve':
        if not (OUTPUT / 'index.html').exists():
            build()
        class Handler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *a, **kw):
                super().__init__(*a, directory=str(OUTPUT), **kw)
        print(f'The Seed: http://127.0.0.1:{args.port}', flush=True)
        http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))
