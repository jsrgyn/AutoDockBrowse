#!/bin/bash

echo "Limpando containers e volumes Docker antigos..."
docker-compose down -v
docker system prune -f

echo "Construindo e executando..."
docker-compose up --build