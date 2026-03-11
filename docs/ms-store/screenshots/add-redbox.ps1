# Add red box to screenshot_02 (Import modal - Reference CSV File area)
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Add-RedBox($imgPath, $x, $y, $w, $h, $thickness) {
    $img = [System.Drawing.Image]::FromFile($imgPath)
    $bmp = New-Object System.Drawing.Bitmap($img)
    $img.Dispose()

    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Red, $thickness)
    $g.DrawRectangle($pen, $x, $y, $w, $h)

    $pen.Dispose()
    $g.Dispose()
    $bmp.Save($imgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Red box added: $imgPath"
}

# Reference CSV File area in screenshot_02 (Import modal full size: 1920x1032 + 120 bar = 1152)
# Coordinates: x=570, y=462, width=365, height=100, thickness=5
$thickness = 5
$x = 706
$y = 575
$w = 238
$h = 144

Add-RedBox (Join-Path $scriptDir "en\screenshot_02.png") $x $y $w $h $thickness
Add-RedBox (Join-Path $scriptDir "ko\screenshot_02.png") $x $y $w $h $thickness

Write-Host "Done!"
