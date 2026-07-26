RestApiKey=$(grep '^RestApiKey=' .env | cut -d '=' -f2-)
RestApiURL=http://localhost:3010

dockerStatus=$(systemctl is-active docker)
if test $dockerStatus = "inactive"; then
  echo "Docker is inactive. Run 'systemctl start docker' before executing tests." 1>&2
  exit 1
fi

restApiOnline=$(docker container ls | grep -q "foundryvtt-rest-api" && echo "online" || echo "offline")
if test $restApiOnline = "offline"; then
  echo "Rest Api Offline. Launching docker container..."
  docker compose -f $foundryRelay/docker-compose.local.yml up -d
fi

curl -s -X GET $RestApiURL/clients -H "x-api-key: $RestApiKey" > /dev/null || exit 2

echo "System seems to be online. Starting Tests..."
node main.mjs --rest-api-url $RestApiURL --rest-api-key $RestApiKey
