/**
 * 点球大战 SVG 精灵图
 * 用高质量 SVG 替代 Canvas 逐笔绘制，获得更真实的人物和足球
 */

// ── 守门员 SVG（乐小星吉祥物，200×260 画布） ──
// 结构：头(上) + 颈分割 + 身体(下) + 短腿
// 5 彩星点围绕"头"分布（顶部黑、四角彩色）

const KEEPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260">

<!-- 地面阴影 -->
<ellipse cx="100" cy="256" rx="45" ry="4" fill="#000" opacity="0.18"/>

<!-- 头部由 Canvas 绘制 PNG 图片替代 -->

<!-- ═══ 身体（独立形状，紧贴头部下方，保留分界线） ═══ -->
<!-- 身体顶 y=141 紧贴头底，底 y=230，两侧略外扩做"肩膀"效果 -->
<path d="M 64,142
         C 56,148 50,158 50,172
         L 50,210
         C 50,222 60,230 76,230
         L 124,230
         C 140,230 150,222 150,210
         L 150,172
         C 150,158 144,148 136,142 Z"
      fill="#fff" stroke="#333" stroke-width="2.5" stroke-linejoin="round"/>

<!-- ═══ 体彩星标志（胸前） ═══ -->
<g transform="translate(100,195)">
  <polygon points="0,-12 2.8,-4.2 10.5,-4.2 4.5,0.9 6.5,8.5 0,4.2 -6.5,8.5 -4.5,0.9 -10.5,-4.2 -2.8,-4.2" 
           fill="none" stroke="#ea4335" stroke-width="1.8" stroke-linejoin="round"/>
  <line x1="-3.2" y1="-1.4" x2="3.2" y2="1.4" stroke="#1a73e8" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="-3.2" y1="1.4" x2="3.2" y2="-1.4" stroke="#34a853" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#fbbc05" stroke-width="1.6" stroke-linecap="round"/>
</g>

<!-- ═══ 短腿（两条小腿，圆角末端） ═══ -->
<path d="M 78,228 L 78,250 Q 78,254 84,254 L 88,254 Q 92,254 92,250 L 92,228 Z" 
      fill="#fff" stroke="#333" stroke-width="2" stroke-linejoin="round"/>
<path d="M 108,228 L 108,250 Q 108,254 112,254 L 116,254 Q 122,254 122,250 L 122,228 Z" 
      fill="#fff" stroke="#333" stroke-width="2" stroke-linejoin="round"/>

<!-- 手臂由 Canvas 动态绘制 -->
</svg>`;


// ── 足球 SVG（经典 Telstar 3D，100×100 画布） ──

const BALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs>
<radialGradient id="bs" cx="0.35" cy="0.35" r="0.65">
<stop offset="0%" stop-color="#ffffff"/>
<stop offset="35%" stop-color="#f2f2f2"/>
<stop offset="60%" stop-color="#d8d8d8"/>
<stop offset="80%" stop-color="#aaaaaa"/>
<stop offset="100%" stop-color="#666666"/>
</radialGradient>
<radialGradient id="bhl" cx="0.28" cy="0.28" r="0.35">
<stop offset="0%" stop-color="#fff" stop-opacity="0.75"/>
<stop offset="100%" stop-color="#fff" stop-opacity="0"/>
</radialGradient>
<radialGradient id="bev" cx="0.5" cy="0.5" r="0.5">
<stop offset="70%" stop-color="#000" stop-opacity="0"/>
<stop offset="100%" stop-color="#000" stop-opacity="0.2"/>
</radialGradient>
</defs>

<!-- 球体底色 -->
<circle cx="50" cy="50" r="48" fill="url(#bs)"/>

<!-- ═══ 黑色五边形（Telstar 花纹） ═══ -->
<!-- 中心五边形 -->
<polygon points="50,30 62,38 58,52 42,52 38,38" fill="#1a1a1a"/>

<!-- 上方五边形 -->
<polygon points="50,4 57,10 54,20 46,20 43,10" fill="#1a1a1a" opacity="0.6"/>

<!-- 右上五边形 -->
<polygon points="80,20 86,28 82,38 74,36 72,26" fill="#1a1a1a" opacity="0.5"/>

<!-- 右下五边形 -->
<polygon points="82,60 86,68 80,76 72,72 72,64" fill="#1a1a1a" opacity="0.4"/>

<!-- 左下五边形 -->
<polygon points="18,60 14,68 20,76 28,72 28,64" fill="#1a1a1a" opacity="0.35"/>

<!-- 左上五边形 -->
<polygon points="20,20 14,28 18,38 26,36 28,26" fill="#1a1a1a" opacity="0.55"/>

<!-- 底部五边形 -->
<polygon points="50,82 58,78 56,88 50,94 44,88 42,78" fill="#1a1a1a" opacity="0.2"/>

<!-- ═══ 缝线 ═══ -->
<g stroke="#888" stroke-width="0.8" fill="none" opacity="0.45">
<!-- 中心五边形到外围的连线 -->
<line x1="50" y1="30" x2="50" y2="20"/>
<line x1="62" y1="38" x2="72" y2="32"/>
<line x1="58" y1="52" x2="68" y2="60"/>
<line x1="42" y1="52" x2="32" y2="60"/>
<line x1="38" y1="38" x2="28" y2="32"/>
<!-- 外围之间的连线 -->
<line x1="54" y1="20" x2="72" y2="26"/>
<line x1="82" y1="38" x2="76" y2="60"/>
<line x1="72" y1="72" x2="56" y2="82"/>
<line x1="44" y1="82" x2="28" y2="72"/>
<line x1="18" y1="60" x2="18" y2="38"/>
<line x1="26" y1="26" x2="46" y2="20"/>
</g>

<!-- 高光（镜面反射） -->
<circle cx="50" cy="50" r="48" fill="url(#bhl)"/>

<!-- 边缘暗角 -->
<circle cx="50" cy="50" r="48" fill="url(#bev)"/>

<!-- 边缘描边 -->
<circle cx="50" cy="50" r="48" fill="none" stroke="#555" stroke-width="1" opacity="0.3"/>
</svg>`;


// ── 图像加载器 ──

function svgToImage(svgStr) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    return img;
}

export const keeperImg = svgToImage(KEEPER_SVG);
export const ballImg = svgToImage(BALL_SVG);

// 乐小星头部 PNG
export const keeperHeadImg = new Image();
keeperHeadImg.src = '/lexiaoxing.png';

/** 是否已加载完毕 */
export function spritesReady() {
    return (keeperImg.complete && keeperImg.naturalWidth > 0)
        && (ballImg.complete && ballImg.naturalWidth > 0);
}
