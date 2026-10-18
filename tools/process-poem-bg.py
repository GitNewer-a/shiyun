#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
诗词背景图后处理：裁掉生成图底部的水印条 → 转 JPEG → 产方形缩略图。

用法：
  python tools/process-poem-bg.py <源图.png> <诗id，如 p001> [--watermark-px 62]

产出（写入 miniprogram/assets/poem-bg/）：
  bg-<id>.jpg     1024 宽竖版全屏背景（详情页 <image mode="aspectFill"> 用）
  thumb-<id>.jpg  240×240 居中方形缩略图（诗词库 144rpx 卡片两倍余量）
"""
import sys, os, argparse
from PIL import Image

ASSETS = os.path.join(os.path.dirname(__file__), '..', 'miniprogram', 'assets', 'poem-bg')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('poem_id')
    ap.add_argument('--watermark-px', type=int, default=62,
                    help='裁掉底部水印条的像素高度（默认 62，覆盖「AI生成」水印）')
    args = ap.parse_args()

    img = Image.open(args.src).convert('RGB')
    w, h = img.size
    if args.watermark_px > 0:
        img = img.crop((0, 0, w, h - args.watermark_px))
        print('裁掉底部 %dpx 水印条 -> %s' % (args.watermark_px, img.size))

    os.makedirs(ASSETS, exist_ok=True)

    bg = os.path.join(ASSETS, 'bg-%s.jpg' % args.poem_id)
    img.save(bg, 'JPEG', quality=82, optimize=True, progressive=True)
    print('%s  %.0f KB' % (bg, os.path.getsize(bg) / 1024))

    side = min(img.size)
    left, top = (img.width - side) // 2, (img.height - side) // 2
    thumb = img.crop((left, top, left + side, top + side)).resize((240, 240), Image.LANCZOS)
    th = os.path.join(ASSETS, 'thumb-%s.jpg' % args.poem_id)
    thumb.save(th, 'JPEG', quality=82, optimize=True)
    print('%s  %.0f KB' % (th, os.path.getsize(th) / 1024))


if __name__ == '__main__':
    main()
