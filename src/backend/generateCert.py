"""
This generates a self-signed certificate and private key for the server.
Why?
    - on windows, I noticed my queries became much faster when I used SSL. What?
    - afterwards on MacOS, on hitting /prepare I am now getting "Failed to load resource: net::ERR_SSL_PROTOCOL_ERROR"
        - after generating the certificate and private key, I get "POST https://localhost:55000/prepare net::ERR_CERT_AUTHORITY_INVALID"
        - then I added the certificate (on MAcOS) to the keychain and trusted it, but then I get "ERR_CERT_COMMON_NAME_INVALID"
"""
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import Encoding
import datetime

# Generate private key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

# Generate a self-signed certificate
subject = issuer = x509.Name([
    # x509.NameAttribute(NameOID.COMMON_NAME, u"interactive-server.py"),
    x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
])
cert = (
    x509.CertificateBuilder()
    .subject_name(subject)
    .issuer_name(issuer)
    .public_key(private_key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(datetime.datetime.utcnow())
    .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=10000))
    .sign(private_key, hashes.SHA256())
)

# Write private key to file
print ("Writing private key to file")
with open("hostKey.pem", "wb") as f:
    f.write(private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    ))

# Write certificate to file
print ("Writing certificate to file")
with open("hostCert.pem", "wb") as f:
    f.write(cert.public_bytes(Encoding.PEM))