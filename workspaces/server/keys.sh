mkdir ./keys
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out ./keys/privateKey.pem -outform PEM
openssl ec -in ./keys/privateKey.pem -pubout -out ./keys/publicKey.pem