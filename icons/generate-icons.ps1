# SnapGuard Icon Generator - PowerShell Script
# Generates PNG icons using .NET System.Drawing

Add-Type -AssemblyName System.Drawing

function Draw-SnapGuardIcon {
    param([int]$Size)
    
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Background circle with gradient (simplified to solid color)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
    $graphics.FillEllipse($brush, 2, 2, $Size - 4, $Size - 4)
    
    # Shield shape
    $shieldPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $centerX = $Size / 2
    $shieldPoints = @(
        [System.Drawing.Point]::new($centerX, [int]($Size * 0.156)),
        [System.Drawing.Point]::new([int]($Size * 0.313), [int]($Size * 0.234)),
        [System.Drawing.Point]::new([int]($Size * 0.313), [int]($Size * 0.43)),
        [System.Drawing.Point]::new($centerX, [int]($Size * 0.781)),
        [System.Drawing.Point]::new([int]($Size * 0.687), [int]($Size * 0.43)),
        [System.Drawing.Point]::new([int]($Size * 0.687), [int]($Size * 0.234))
    )
    $shieldPath.AddPolygon($shieldPoints)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(242, 255, 255, 255))
    $graphics.FillPath($whiteBrush, $shieldPath)
    
    # Camera lens - outer ring
    $lensCenterY = [int]($Size * 0.43)
    $lensBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(51, 99, 102, 241))
    $graphics.FillEllipse($lensBrush, $centerX - [int]($Size * 0.141), $lensCenterY - [int]($Size * 0.141), [int]($Size * 0.282), [int]($Size * 0.282))
    
    # Camera lens - middle ring (white)
    $whiteLensBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $graphics.FillEllipse($whiteLensBrush, $centerX - [int]($Size * 0.094), $lensCenterY - [int]($Size * 0.094), [int]($Size * 0.188), [int]($Size * 0.188))
    
    # Camera lens - inner ring (purple)
    $graphics.FillEllipse($brush, $centerX - [int]($Size * 0.063), $lensCenterY - [int]($Size * 0.063), [int]($Size * 0.126), [int]($Size * 0.126))
    
    # Camera lens - center dot (white)
    $graphics.FillEllipse($whiteLensBrush, $centerX - [int]($Size * 0.031), $lensCenterY - [int]($Size * 0.031), [int]($Size * 0.062), [int]($Size * 0.062))
    
    # Shutter lines
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(153, 99, 102, 241), [Math]::Max(1, [int]($Size * 0.012)))
    $graphics.DrawLine($pen, $centerX, $lensCenterY - [int]($Size * 0.063), $centerX, $lensCenterY + [int]($Size * 0.063))
    $graphics.DrawLine($pen, $centerX - [int]($Size * 0.063), $lensCenterY, $centerX + [int]($Size * 0.063), $lensCenterY)
    
    $graphics.Dispose()
    return $bitmap
}

$sizes = @(16, 48, 128)

foreach ($size in $sizes) {
    $bitmap = Draw-SnapGuardIcon -Size $size
    $filename = "icon-$size.png"
    $bitmap.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host "Generated $filename"
}

Write-Host "All icons generated successfully!"

