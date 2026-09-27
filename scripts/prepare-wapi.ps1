$ErrorActionPreference='Stop'
function Get-Sha256([string]$path) {
  $algorithm=[Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($algorithm.ComputeHash([IO.File]::ReadAllBytes($path))).Replace('-','') }
  finally { $algorithm.Dispose() }
}
$nativeDir=Join-Path $PSScriptRoot '../simtracker/native'
$dllPath=Join-Path $nativeDir 'FSUIPC_WAPID.dll'
$expected='FB858F0CF816104C64E714EA343B54B360765C0B459410F511C1BDAD2776172B'
if ((Test-Path -LiteralPath $dllPath) -and (Get-Sha256 $dllPath) -eq $expected) { exit 0 }
New-Item -ItemType Directory -Force -Path $nativeDir | Out-Null
$zipPath=Join-Path $nativeDir 'FSUIPC-WASMv1.1.0.zip'
$client=New-Object Net.WebClient
try { $client.DownloadFile('https://fsuipc.com/download/FSUIPC-WASMv1.1.0.zip',$zipPath) } finally { $client.Dispose() }
[Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem') | Out-Null
$outer=[IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entry=$outer.GetEntry('FSUIPC_WAPI.zip')
  if (!$entry) { throw 'WAPI archive missing from download' }
  $buffer=New-Object IO.MemoryStream
  $stream=$entry.Open()
  try { $stream.CopyTo($buffer) } finally { $stream.Dispose() }
  $buffer.Position=0
  $inner=New-Object IO.Compression.ZipArchive($buffer)
  try {
    $dll=$inner.GetEntry('FSUIPC_WAPI/dll/FSUIPC_WAPID.dll')
    if (!$dll) { throw 'WAPI DLL missing from archive' }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($dll,$dllPath,$true)
  } finally { $inner.Dispose(); $buffer.Dispose() }
} finally { $outer.Dispose() }
if ((Get-Sha256 $dllPath) -ne $expected) { throw 'WAPI DLL checksum mismatch' }
Write-Output 'Verified FSUIPC WAPI 1.1.0 runtime.'
