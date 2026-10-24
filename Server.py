import os
import datetime
import ipaddress
from pathlib import Path
from typing import Final

import uvicorn
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.general_name import DNSName, IPAddress
from cryptography.x509.oid import NameOID

from LOG import system_logger
from API.Config import API_HOST, API_PORT
from CORE.UTILITIES.constants import CERT_FILE_PATH, KEY_FILE_PATH

def generate_self_signed_cert() -> None:
    if Path(CERT_FILE_PATH).exists() and Path(KEY_FILE_PATH).exists():
        return

    system_logger.info("Generating self-signed SSL Certificates for HTTPS transit...")
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "NMEA Analyzer Local"),
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
    ])

    cert_builder = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(private_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName([
                DNSName("localhost"),
                IPAddress(ipaddress.IPv4Address("127.0.0.1")),
            ]),
            critical=False,
        )
    )

    cert = cert_builder.sign(private_key, hashes.SHA256())
    with open(KEY_FILE_PATH, "wb") as key_out:
        key_out.write(
            private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )

    with open(CERT_FILE_PATH, "wb") as cert_out:
        cert_out.write(cert.public_bytes(serialization.Encoding.PEM))
    system_logger.info("SSL Certificates written successfully to target paths.")

if __name__ == "__main__":
    # generate_self_signed_cert()
    uvicorn.run(
        "API.Main:app",
        host=API_HOST,
        port=API_PORT,
        # ssl_keyfile=KEY_FILE_PATH,
        # ssl_certfile=CERT_FILE_PATH,
        reload=True,
    )