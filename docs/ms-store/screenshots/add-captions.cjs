const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const scriptDir = __dirname
const enDir = path.join(scriptDir, 'en')
const koDir = path.join(scriptDir, 'ko')

fs.mkdirSync(enDir, { recursive: true })
fs.mkdirSync(koDir, { recursive: true })

const files = [
  '스크린샷 2026-02-27 172110.png',
  '스크린샷 2026-02-27 172759.png',
  '스크린샷 2026-02-27 182903.png',
  '스크린샷 2026-02-27 182932.png',
  '스크린샷 2026-02-27 183028.png',
  '스크린샷 2026-02-27 183050.png',
  '스크린샷 2026-02-27 183133.png',
  '스크린샷 2026-02-27 183142.png',
  '스크린샷 2026-02-27 183241.png',
  '스크린샷 2026-02-27 183257.png',
  '스크린샷 2026-02-27 183316.png',
  '스크린샷 2026-02-27 183330.png',
  '스크린샷 2026-02-27 183426.png',
  '스크린샷 2026-02-27 183529.png',
  '스크린샷 2026-02-27 183650.png',
  '스크린샷 2026-02-27 183730.png',
  '스크린샷 2026-02-27 184310.png',
]

const captionsEN = [
  'Built-in Whisk Browser + AI Generation Panel',
  'Import from Text, CSV, SRT with Guide and Samples',
  'Add Reference Images for Visual Consistency',
  'Multiple Import Formats Supported',
  'Scene List with Prompts and Watch Tags',
  'Scenes Ready for Bulk Generation',
  'Bulk AI Image Generation in Progress',
  '200+ Images Generated with Consistent Style',
  'Auto-Save All Generated Images Locally',
  'One-Click Export to CapCut Project',
  'Ken Burns Effect + Auto Subtitles (SRT)',
  'Launching CapCut with Your Project',
  'Before Opening CapCut Project',
  'Complete Timeline with Images and Subtitles',
  'Auto-Saved Images in Local Storage',
  'After Opening CapCut Project',
  'Settings: Storage, Generation and Display',
]

const captionsKO = [
  '\uB0B4\uC7A5 Whisk \uBE0C\uB77C\uC6B0\uC800 + AI \uC0DD\uC131 \uD328\uB110',
  '\uD14D\uC2A4\uD2B8, CSV, SRT \uAC00\uC838\uC624\uAE30 \u2014 \uAC00\uC774\uB4DC \uBC0F \uC0D8\uD50C \uC81C\uACF5',
  '\uB808\uD37C\uB7F0\uC2A4 \uC774\uBBF8\uC9C0\uB85C \uC2DC\uAC01\uC801 \uC77C\uAD00\uC131 \uC720\uC9C0',
  '\uB2E4\uC591\uD55C \uAC00\uC838\uC624\uAE30 \uD615\uC2DD \uC9C0\uC6D0',
  '\uC528 \uBAA9\uB85D \u2014 \uD504\uB86C\uD504\uD2B8 \uBC0F \uD0DC\uADF8 \uAD00\uB9AC',
  '\uC528 \uC900\uBE44 \uC644\uB8CC \u2014 \uB300\uB7C9 \uC0DD\uC131 \uC2DC\uC791',
  'AI \uC774\uBBF8\uC9C0 \uB300\uB7C9 \uC0DD\uC131 \uC9C4\uD589 \uC911',
  '200\uC7A5 \uC774\uC0C1 \uC77C\uAD00\uB41C \uC2A4\uD0C0\uC77C\uB85C \uC0DD\uC131 \uC644\uB8CC',
  '\uC0DD\uC131\uB41C \uC774\uBBF8\uC9C0 \uC790\uB3D9 \uC800\uC7A5',
  '\uC6D0\uD074\uB9AD CapCut \uD504\uB85C\uC81D\uD2B8 \uB0B4\uBCF4\uB0B4\uAE30',
  'Ken Burns \uD6A8\uACFC + \uC790\uB3D9 \uC790\uB9C9 (SRT)',
  'CapCut\uC73C\uB85C \uD504\uB85C\uC81D\uD2B8 \uBC14\uB85C \uC2E4\uD589',
  'CapCut \uD504\uB85C\uC81D\uD2B8 \uC624\uD508 \uC804',
  '\uC774\uBBF8\uC9C0 + \uC790\uB9C9\uC774 \uD3EC\uD568\uB41C \uC644\uC131 \uD0C0\uC784\uB77C\uC778',
  '\uB85C\uCEEC \uC800\uC7A5\uC18C\uC5D0 \uC790\uB3D9 \uC800\uC7A5\uB41C \uC774\uBBF8\uC9C0',
  'CapCut \uD504\uB85C\uC81D\uD2B8 \uC624\uD508 \uD6C4',
  '\uC124\uC815: \uC800\uC7A5\uC18C, \uC0DD\uC131, \uB514\uC2A4\uD50C\uB808\uC774',
]

// Generate PowerShell script dynamically with escaped strings
function generatePS1(captions, outDir, lang) {
  let script = `
Add-Type -AssemblyName System.Drawing

function Add-Caption {
    param($srcPath, $outPath, $caption)

    $img = [System.Drawing.Image]::FromFile($srcPath)
    $w = $img.Width
    $h = $img.Height
    $barHeight = 120
    $newH = $h + $barHeight

    $bmp = New-Object System.Drawing.Bitmap($w, $newH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'HighQuality'
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $g.DrawImage($img, 0, 0, $w, $h)

    # Dark bar background
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 20, 20, 20))
    $g.FillRectangle($barBrush, 0, $h, $w, $barHeight)

    $font = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textRect = New-Object System.Drawing.RectangleF(0, $h, $w, $barHeight)

    # Shadow (dark outline behind text)
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
    foreach ($dx in @(-2, -1, 0, 1, 2)) {
        foreach ($dy in @(-2, -1, 0, 1, 2)) {
            if ($dx -ne 0 -or $dy -ne 0) {
                $shadowRect = New-Object System.Drawing.RectangleF($dx, ($h + $dy), $w, $barHeight)
                $g.DrawString($caption, $font, $shadowBrush, $shadowRect, $sf)
            }
        }
    }

    # Outline (dark border around text)
    $outlineBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 40, 40, 40))
    foreach ($dx in @(-3, -2, -1, 0, 1, 2, 3)) {
        foreach ($dy in @(-3, -2, -1, 0, 1, 2, 3)) {
            if ([Math]::Abs($dx) -eq 3 -or [Math]::Abs($dy) -eq 3) {
                $outlineRect = New-Object System.Drawing.RectangleF($dx, ($h + $dy), $w, $barHeight)
                $g.DrawString($caption, $font, $outlineBrush, $outlineRect, $sf)
            }
        }
    }

    # Yellow text
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 215, 0))
    $g.DrawString($caption, $font, $textBrush, $textRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $sf.Dispose(); $font.Dispose(); $textBrush.Dispose(); $shadowBrush.Dispose(); $outlineBrush.Dispose(); $barBrush.Dispose()
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
`

  for (let i = 0; i < files.length; i++) {
    const num = String(i + 1).padStart(2, '0')
    const srcPath = path.join(scriptDir, files[i]).replace(/\//g, '\\')
    const outPath = path.join(outDir, `screenshot_${num}.png`).replace(/\//g, '\\')
    // Escape single quotes in caption
    const caption = captions[i].replace(/'/g, "''")
    script += `\nAdd-Caption '${srcPath}' '${outPath}' '${caption}'`
    script += `\nWrite-Host "screenshot_${num}.png done"`
  }

  const ps1Path = path.join(scriptDir, `_gen_${lang}.ps1`)
  // Write with BOM for PowerShell UTF-8 compatibility
  const bom = Buffer.from([0xEF, 0xBB, 0xBF])
  const content = Buffer.from(script, 'utf8')
  fs.writeFileSync(ps1Path, Buffer.concat([bom, content]))
  return ps1Path
}

const enPS1 = generatePS1(captionsEN, enDir, 'en')
console.log('Generated EN script:', enPS1)

const koPS1 = generatePS1(captionsKO, koDir, 'ko')
console.log('Generated KO script:', koPS1)

// Execute
console.log('\n--- Generating EN screenshots ---')
execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${enPS1}"`, { stdio: 'inherit' })

console.log('\n--- Generating KO screenshots ---')
execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${koPS1}"`, { stdio: 'inherit' })

console.log('\nDone! ' + files.length + ' screenshots x 2 languages = ' + (files.length * 2) + ' files')
