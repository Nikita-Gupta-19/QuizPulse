$dockerReady = $false
for ($i = 1; $i -le 15; $i++) {
    Write-Host "Checking if Docker is ready (Attempt $i/15)..."
    & docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        break
    }
    Start-Sleep -Seconds 5
}

if ($dockerReady) {
    Write-Host "Docker daemon is active! Launching docker compose cluster..."
    & docker compose up --build -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Containers launched successfully. Waiting 20 seconds for MongoDB to start up and initialize..."
        Start-Sleep -Seconds 20
        Write-Host "Seeding the database with Faker..."
        & docker compose exec -T backend python app/seed/seed.py
        Write-Host "Seeding complete! The application is fully active."
        Write-Host "--------------------------------------------------"
        Write-Host "Frontend Portal: http://localhost:3000"
        Write-Host "Backend Swagger Documentation: http://localhost:8000/docs"
        Write-Host "--------------------------------------------------"
    } else {
        Write-Host "Docker compose failed to start."
    }
} else {
    Write-Host "Docker Desktop took too long to start or is unresponsive."
    Write-Host "Please open Docker Desktop manually, make sure it is running, and then run:"
    Write-Host "  docker compose up --build -d"
    Write-Host "  docker compose exec -T backend python app/seed/seed.py"
}
