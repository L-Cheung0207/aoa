param(
  [Parameter(Mandatory = $true)]
  [string] $ProgressBar,

  [Parameter(Mandatory = $true)]
  [string] $StatusLabel,

  [Parameter(Mandatory = $true)]
  [string] $Background,

  [Parameter(Mandatory = $true)]
  [string] $BackgroundImage,

  [Parameter(Mandatory = $true)]
  [string] $Sentinel
)

$ErrorActionPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Drawing

Add-Type -Namespace VoiceInstaller -Name NativeMethods -MemberDefinition @"
  [System.Runtime.InteropServices.DllImport("user32.dll")]
  public static extern bool IsWindow(System.IntPtr hWnd);

  [System.Runtime.InteropServices.DllImport("user32.dll", EntryPoint="SendMessageW")]
  public static extern System.IntPtr SendMessage(System.IntPtr hWnd, int msg, System.IntPtr wParam, System.IntPtr lParam);

  [System.Runtime.InteropServices.DllImport("gdi32.dll")]
  public static extern bool DeleteObject(System.IntPtr hObject);
"@

$barHandle = [System.IntPtr]::new([int64] $ProgressBar)
$labelHandle = [System.IntPtr]::new([int64] $StatusLabel)
$backgroundHandle = [System.IntPtr]::new([int64] $Background)
$stmSetImage = 0x0172
$imageBitmap = 0
$pbmGetPos = 0x0408
$pbmGetRange = 0x0407
$statusX = 306
$statusY = 474
$statusWidth = 168
$statusHeight = 28
$currentBitmapHandle = [System.IntPtr]::Zero
$lastPercent = $null
$backgroundBitmap = [System.Drawing.Bitmap]::FromFile($BackgroundImage)
$font = [System.Drawing.Font]::new("Microsoft YaHei UI", 11, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
$brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(0x11, 0x11, 0x11))
$format = [System.Drawing.StringFormat]::new()
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$format.FormatFlags = $format.FormatFlags -bor [System.Drawing.StringFormatFlags]::NoWrap
$installingTextFormat = [string]::Concat(
  [char] 0x6B63,
  [char] 0x5728,
  [char] 0x5B89,
  [char] 0x88C5,
  " {0}%"
)

function Set-StatusBitmap {
  param([int] $Percent)

  $bitmap = [System.Drawing.Bitmap]::new($statusWidth, $statusHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $sourceRect = [System.Drawing.Rectangle]::new($statusX, $statusY, $statusWidth, $statusHeight)
  $targetRect = [System.Drawing.Rectangle]::new(0, 0, $statusWidth, $statusHeight)
  $graphics.DrawImage($backgroundBitmap, $targetRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString(($installingTextFormat -f $Percent), $font, $brush, [System.Drawing.RectangleF]::new(0, 0, $statusWidth, $statusHeight), $format)
  $graphics.Dispose()

  $nextBitmapHandle = $bitmap.GetHbitmap()
  $bitmap.Dispose()
  [void] [VoiceInstaller.NativeMethods]::SendMessage($labelHandle, $stmSetImage, [System.IntPtr]::new($imageBitmap), $nextBitmapHandle)

  if ($script:currentBitmapHandle -ne [System.IntPtr]::Zero) {
    [void] [VoiceInstaller.NativeMethods]::DeleteObject($script:currentBitmapHandle)
  }

  $script:currentBitmapHandle = $nextBitmapHandle
}

try {
  while ((Test-Path -LiteralPath $Sentinel) -and
         [VoiceInstaller.NativeMethods]::IsWindow($barHandle) -and
         [VoiceInstaller.NativeMethods]::IsWindow($labelHandle) -and
         [VoiceInstaller.NativeMethods]::IsWindow($backgroundHandle)) {
    $position = [VoiceInstaller.NativeMethods]::SendMessage($barHandle, $pbmGetPos, [System.IntPtr]::Zero, [System.IntPtr]::Zero).ToInt64()
    $low = [VoiceInstaller.NativeMethods]::SendMessage($barHandle, $pbmGetRange, [System.IntPtr]::new(1), [System.IntPtr]::Zero).ToInt64()
    $high = [VoiceInstaller.NativeMethods]::SendMessage($barHandle, $pbmGetRange, [System.IntPtr]::Zero, [System.IntPtr]::Zero).ToInt64()
    $range = $high - $low

    if ($range -le 0) {
      $percent = 0
    } else {
      $percent = [Math]::Floor((($position - $low) * 100) / $range)
    }

    if ($percent -lt 0) {
      $percent = 0
    } elseif ($percent -gt 100) {
      $percent = 100
    }

    if ($lastPercent -ne $percent) {
      Set-StatusBitmap -Percent $percent
      $lastPercent = $percent
    }

    Start-Sleep -Milliseconds 100
  }
} finally {
  if ($currentBitmapHandle -ne [System.IntPtr]::Zero) {
    [void] [VoiceInstaller.NativeMethods]::DeleteObject($currentBitmapHandle)
  }
  $format.Dispose()
  $brush.Dispose()
  $font.Dispose()
  $backgroundBitmap.Dispose()
}
