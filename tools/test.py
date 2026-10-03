#!/usr/bin/env python3
"""Compila el SDK, el plugin y sus tests, y ejecuta los tests."""
import pathlib
import subprocess
import tempfile

root = pathlib.Path(__file__).resolve().parent.parent
sources = [*sorted((root / 'sdk' / 'src').rglob('*.java')),
           *sorted((root / 'src').rglob('*.java')),
           *sorted((root / 'tests').rglob('*.java'))]

with tempfile.TemporaryDirectory(prefix='kiosk-plugin-test-') as out:
    subprocess.run(['javac', '--release', '8', '-Xlint:-options', '-d', out, *map(str, sources)], check=True)
    subprocess.run(['java', '-ea', '-cp', out, 'EilikFaceTest'], check=True)
