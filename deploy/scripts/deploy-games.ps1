# ===== 小游戏部署脚本 =====
# 将混淆后的3个游戏上传到服务器

$server = "43.139.235.181"
$user   = "root"
$local  = "e:/CJDLT/dist/games"
$remote = "/opt/cjdlt/dist/games"

Write-Host "===== 部署小游戏 =====" -ForegroundColor Cyan
Write-Host "服务器: $server"
Write-Host "路径:   $remote"
Write-Host ""

# 创建远程目录
ssh "${user}@${server}" "mkdir -p $remote" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "SSH 连接失败，请确认已配置密钥或手动输入密码" -ForegroundColor Red
    exit 1
}

$games = @('lianliankan','xiaoxiaole','flappy-bird')
foreach ($g in $games) {
    Write-Host "上传 $g ..." -NoNewline
    scp -r "$local/$g" "${user}@${server}:$remote/" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " 完成" -ForegroundColor Green
    } else {
        Write-Host " 失败" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "===== 部署完成 =====" -ForegroundColor Cyan
Write-Host "访问地址: http://$server:3366/games/lianliankan/" -ForegroundColor Yellow
Write-Host "          http://$server:3366/games/xiaoxiaole/" -ForegroundColor Yellow
Write-Host "          http://$server:3366/games/flappy-bird/" -ForegroundColor Yellow
