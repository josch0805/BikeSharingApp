# Erzeugt public/icon-192.png und public/icon-512.png (vereinfachtes Lastenrad-Symbol)
Add-Type -AssemblyName System.Drawing
foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 512.0
  $g.Clear([System.Drawing.Color]::FromArgb(47, 125, 79))
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (26 * $s)
  $pen.StartCap = 'Round'; $pen.EndCap = 'Round'; $pen.LineJoin = 'Round'
  $g.DrawEllipse($pen, (88 * $s), (288 * $s), (124 * $s), (124 * $s))
  $g.DrawEllipse($pen, (318 * $s), (288 * $s), (124 * $s), (124 * $s))
  $g.DrawRectangle($pen, (96 * $s), (200 * $s), (150 * $s), (86 * $s))
  $g.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF (246 * $s), (286 * $s)),
    (New-Object System.Drawing.PointF (300 * $s), (200 * $s)),
    (New-Object System.Drawing.PointF (380 * $s), (350 * $s))))
  $g.DrawLine($pen, (150 * $s), (350 * $s), (246 * $s), (286 * $s))
  $g.DrawLines($pen, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF (300 * $s), (200 * $s)),
    (New-Object System.Drawing.PointF (300 * $s), (160 * $s)),
    (New-Object System.Drawing.PointF (340 * $s), (160 * $s))))
  $out = Join-Path $PSScriptRoot "..\public\icon-$size.png"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
