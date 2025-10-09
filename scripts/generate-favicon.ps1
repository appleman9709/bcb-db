Add-Type -AssemblyName System.Drawing

$size = 512
$iconsDir = Join-Path (Resolve-Path '.') 'public\icons'
if (-not (Test-Path $iconsDir)) {
    throw 'Icons directory not found.'
}

$baseBitmap = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($baseBitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))

$rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255,255,244,252)), ([System.Drawing.Color]::FromArgb(255,201,228,255)), 45
$g.FillRectangle($bgBrush, $rect)
$bgBrush.Dispose()

$circleRect = New-Object System.Drawing.Rectangle 76, 76, 360, 360
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240,255,255,255))
$g.FillEllipse($whiteBrush, $circleRect)
$whiteBrush.Dispose()

$bodyPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$bodyPath.AddBezier((New-Object System.Drawing.PointF 256,214), (New-Object System.Drawing.PointF 360,232), (New-Object System.Drawing.PointF 354,360), (New-Object System.Drawing.PointF 256,388))
$bodyPath.AddBezier((New-Object System.Drawing.PointF 256,388), (New-Object System.Drawing.PointF 158,360), (New-Object System.Drawing.PointF 152,232), (New-Object System.Drawing.PointF 256,214))
$bodyPath.CloseFigure()

$bodyBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $bodyPath
$bodyBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 96, 165, 250)
$bodyBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 139, 92, 246))
$g.FillPath($bodyBrush, $bodyPath)
$bodyBrush.Dispose()
$bodyPath.Dispose()

$slingPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$slingPath.AddBezier((New-Object System.Drawing.PointF 256,236), (New-Object System.Drawing.PointF 320,264), (New-Object System.Drawing.PointF 314,330), (New-Object System.Drawing.PointF 256,348))
$slingPath.AddBezier((New-Object System.Drawing.PointF 256,348), (New-Object System.Drawing.PointF 198,330), (New-Object System.Drawing.PointF 192,264), (New-Object System.Drawing.PointF 256,236))
$slingPath.CloseFigure()

$slingBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $slingPath
$slingBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 129, 199, 212)
$slingBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 59, 130, 246))
$g.FillPath($slingBrush, $slingPath)
$slingBrush.Dispose()
$slingPath.Dispose()

$faceRect = New-Object System.Drawing.Rectangle 206, 168, 100, 100
$faceBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 230, 214))
$g.FillEllipse($faceBrush, $faceRect)
$faceBrush.Dispose()

$shineBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90,255,255,255))
$g.FillEllipse($shineBrush, 226, 182, 56, 36)
$shineBrush.Dispose()

$eyeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 47, 68))
$g.FillEllipse($eyeBrush, 234, 208, 18, 18)
$g.FillEllipse($eyeBrush, 260, 208, 18, 18)
$eyeBrush.Dispose()

$smilePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 47, 62, 90), 10)
$smilePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$smilePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($smilePen, 232, 216, 72, 56, 25, 130)
$smilePen.Dispose()

$hairPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 47, 62, 90), 8)
$hairPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$hairPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($hairPen, 236, 162, 40, 28, 200, 120)
$hairPen.Dispose()

$heartPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$heartPath.AddBezier((New-Object System.Drawing.PointF 336,176), (New-Object System.Drawing.PointF 336,154), (New-Object System.Drawing.PointF 310,154), (New-Object System.Drawing.PointF 310,176))
$heartPath.AddBezier((New-Object System.Drawing.PointF 310,176), (New-Object System.Drawing.PointF 310,200), (New-Object System.Drawing.PointF 336,210), (New-Object System.Drawing.PointF 336,232))
$heartPath.AddBezier((New-Object System.Drawing.PointF 336,232), (New-Object System.Drawing.PointF 336,210), (New-Object System.Drawing.PointF 362,200), (New-Object System.Drawing.PointF 362,176))
$heartPath.AddBezier((New-Object System.Drawing.PointF 362,176), (New-Object System.Drawing.PointF 362,154), (New-Object System.Drawing.PointF 336,154), (New-Object System.Drawing.PointF 336,176))
$heartPath.CloseFigure()

$heartBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 244, 114, 182))
$g.FillPath($heartBrush, $heartPath)
$heartBrush.Dispose()
$heartPath.Dispose()

$sparkleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$g.FillEllipse($sparkleBrush, 166, 150, 28, 28)
$sparkleBrush.Dispose()

$g.Dispose()

$sourcePath = Join-Path $iconsDir 'icon-source-512.png'
$baseBitmap.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Png)

$baseImage = [System.Drawing.Image]::FromFile($sourcePath)

$sizes = 16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512
foreach ($s in $sizes) {
    $dest = Join-Path $iconsDir ("icon-{0}x{0}.png" -f $s)
    $scaled = New-Object System.Drawing.Bitmap $s, $s
    $graphics = [System.Drawing.Graphics]::FromImage($scaled)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($baseImage, 0, 0, $s, $s)
    $graphics.Dispose()
    $scaled.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $scaled.Dispose()
}

$baseImage.Dispose()
$baseBitmap.Dispose()
