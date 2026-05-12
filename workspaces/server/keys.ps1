# Create the directory
New-Item -ItemType Directory -Path .\keys -Force

# Generate the private key
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out .\keys\privateKey.pem -outform PEM

# Extract the public key
openssl ec -in .\keys\privateKey.pem -pubout -out .\keys\publicKey.pem