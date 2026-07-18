RestApiKey=c355464bfce8df4165422badb8f2921d58b438590888e6e7bf7142ed1b6578d8
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
node main.js --rest-api-url $RestApiURL --rest-api-key $RestApiKey
