import os
import uvicorn
import datetime
import ipaddress
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.x509.general_name import DNSName, IPAddress
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# Encapsulated imports
from CORE.UTILITIES.constants import CERT_FILE_PATH, KEY_FILE_PATH
from API.Config import API_HOST, API_PORT

def _generate_self_signed_cert() -> None:
    """Generates a self-signed certificate if one doesn't exist for HTTPS compliance."""
    if os.path.exists(CERT_FILE_PATH) and os.path.exists(KEY_FILE_PATH):
        return

    print("[*] Generating self-signed SSL Certificates for secure transit...")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"NMEA Analyzer Local"),
        x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
    ])
    
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
    ).add_extension(
        # Injecting both DNS and IP explicitly stops modern browsers from rejecting 127.0.0.1 requests
        x509.SubjectAlternativeName([
            DNSName(u"localhost"),
            IPAddress(ipaddress.IPv4Address(u"127.0.0.1"))
        ]),
        critical=False,
    ).sign(key, hashes.SHA256())

    with open(KEY_FILE_PATH, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    with open(CERT_FILE_PATH, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
    print("[+] SSL Certificates generated successfully.")


if __name__ == "__main__":
    _generate_self_signed_cert()
    
    uvicorn.run(
        "API.Main:app",
        host=API_HOST,
        port=API_PORT,
        ssl_keyfile=KEY_FILE_PATH,
        ssl_certfile=CERT_FILE_PATH,
        reload=False  # Disabled for release readiness
    )