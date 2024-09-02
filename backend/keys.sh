mkdir ./keys
openssl ecparam -genkey -name prime256v1 -noout -out ./keys/privateKey.pem
openssl ec -in ./keys/privateKey.pem -pubout -out ./keys/publicKey.pem