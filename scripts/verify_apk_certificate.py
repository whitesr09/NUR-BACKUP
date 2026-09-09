#!/usr/bin/env python3
"""Verify an APK against the pinned NUR signing certificate without using private key material."""
import argparse
import re
import subprocess
import sys

DIGEST = re.compile(r'^\s*(?:V\d+(?:\.\d+)?\s+)?Signer(?:\s+#\d+)?:?\s+certificate SHA-256 digest:\s*([0-9a-fA-F:]+)\s*$', re.MULTILINE)


def normalize_digest(value):
    digest = value.replace(':', '').strip().lower()
    if not re.fullmatch(r'[0-9a-f]{64}', digest):
        raise ValueError('Invalid SHA-256 certificate digest')
    return digest


def verify_certificate_output(output, expected):
    expected = normalize_digest(expected)
    digests = {normalize_digest(value) for value in DIGEST.findall(output)}
    if not digests:
        raise ValueError('No signing certificate was reported by apksigner')
    if digests != {expected}:
        raise ValueError('APK signing certificate does not match the original NUR identity')
    return expected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apksigner')
    parser.add_argument('apk')
    parser.add_argument('expected_sha256')
    args = parser.parse_args()
    result = subprocess.run([args.apksigner, 'verify', '--print-certs', args.apk], check=True, capture_output=True, text=True)
    verify_certificate_output(result.stdout, args.expected_sha256)
    print('Original NUR APK signing certificate verified.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, subprocess.CalledProcessError, OSError) as error:
        print('APK verification failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
