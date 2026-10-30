param(
    [ValidateSet("run", "migrate", "check", "migration-check", "test", "seed-extended-demo", "seed-shariatpur")][string]$Mode = "run",
    [ValidateRange(1024, 65535)][int]$Port = 8002,
    [string[]]$TestLabels = @("apps")
)
$ErrorActionPreference = "Stop"
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskConfig = Join-Path $taskRoot ".env.docker.local"
if (!(Test-Path -LiteralPath $taskConfig)) { throw "Create the ignored .env.docker.local before starting." }
$taskValues = @{}
Get-Content -LiteralPath $taskConfig | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') { $taskValues[$matches[1]] = $matches[2] }
}
if (!$taskValues.POSTGRES_PASSWORD) { throw "Local PostgreSQL password is missing." }
$taskUser = [Uri]::EscapeDataString($taskValues.POSTGRES_USER)
$taskPassword = [Uri]::EscapeDataString($taskValues.POSTGRES_PASSWORD)
$taskDatabase = [Uri]::EscapeDataString($taskValues.POSTGRES_DB)
$env:DATABASE_URL = "postgresql://${taskUser}:${taskPassword}@127.0.0.1:$($taskValues.POSTGRES_PORT)/${taskDatabase}"
$env:DJANGO_DEBUG = "true"
$taskPython = Join-Path $taskRoot ".venv/Scripts/python.exe"
$taskManage = Join-Path $taskRoot "backend/manage.py"
switch ($Mode) {
    "run" { & $taskPython $taskManage runserver "127.0.0.1:$Port" --noreload }
    "migrate" { & $taskPython $taskManage migrate --noinput }
    "check" { & $taskPython $taskManage check }
    "migration-check" { & $taskPython $taskManage makemigrations --check --dry-run }
    "test" { Push-Location (Join-Path $taskRoot "backend"); try { & $taskPython $taskManage test @TestLabels --noinput } finally { Pop-Location } }
    "seed-extended-demo" { & $taskPython $taskManage seed_extended_demo }
    "seed-shariatpur" { & $taskPython $taskManage seed_shariatpur_areas }
}
exit $LASTEXITCODE
