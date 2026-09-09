import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / 'scripts' / 'verify_apk_certificate.py'
spec = importlib.util.spec_from_file_location('nur_apk_verify', path)
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)

EXPECTED = 'ec1880cc651af8fe85dc806d1e89a497b1d22dc7f55ec2c7c2e5cef133cf1bcc'


class CertificateVerificationTests(unittest.TestCase):
    def test_legacy_signer_label(self):
        self.assertEqual(verify.verify_certificate_output('Signer #1 certificate SHA-256 digest: ' + EXPECTED, EXPECTED), EXPECTED)

    def test_modern_signer_label(self):
        output = 'V3.0 Signer: certificate SHA-256 digest: ' + EXPECTED.upper()
        self.assertEqual(verify.verify_certificate_output(output, EXPECTED), EXPECTED)

    def test_multiple_schemes_with_same_certificate(self):
        output = '\n'.join('V' + scheme + ' Signer: certificate SHA-256 digest: ' + EXPECTED for scheme in ['2.0', '3.0'])
        self.assertEqual(verify.verify_certificate_output(output, EXPECTED), EXPECTED)

    def test_wrong_certificate_is_rejected(self):
        with self.assertRaises(ValueError):
            verify.verify_certificate_output('V3.0 Signer: certificate SHA-256 digest: ' + 'a' * 64, EXPECTED)

    def test_missing_certificate_is_rejected(self):
        with self.assertRaises(ValueError):
            verify.verify_certificate_output('Verifies\nNumber of signers: 1', EXPECTED)

    def test_mixed_signing_certificates_are_rejected(self):
        output = 'Signer #1 certificate SHA-256 digest: ' + EXPECTED + '\nSigner #2 certificate SHA-256 digest: ' + 'a' * 64
        with self.assertRaises(ValueError):
            verify.verify_certificate_output(output, EXPECTED)

    def test_malformed_digest_is_rejected(self):
        with self.assertRaises(ValueError):
            verify.verify_certificate_output('Signer #1 certificate SHA-256 digest: abc', EXPECTED)


if __name__ == '__main__':
    unittest.main()
