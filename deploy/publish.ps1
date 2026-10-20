param(
  [Parameter(Mandatory = $true)][string]$KeyPath,
  [string]$Remote = 'timoha@185.65.200.231'
)

$ErrorActionPreference = 'Stop'
$release = (Get-Date -Format 'yyyyMMdd-HHmm') + '-' + ([guid]::NewGuid().ToString('N').Substring(0, 6))
$stage = "/home/timoha/vellium-deploy-$release"

npm run --silent build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }

scp -i $KeyPath -o StrictHostKeyChecking=no -r .\dist "${Remote}:$stage"
if ($LASTEXITCODE -ne 0) { throw 'Upload failed' }

scp -i $KeyPath -o StrictHostKeyChecking=no .\deploy\promote.sh "${Remote}:/home/timoha/vellium-promote-$release.sh"
if ($LASTEXITCODE -ne 0) { throw 'Promotion script upload failed' }

ssh -i $KeyPath -o StrictHostKeyChecking=no $Remote "sudo -n bash /home/timoha/vellium-promote-$release.sh $release"
if ($LASTEXITCODE -ne 0) { throw 'Promotion failed; check the server before retrying' }
