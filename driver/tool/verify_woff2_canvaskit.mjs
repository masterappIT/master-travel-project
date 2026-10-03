// Run in a browser against an isolated candidate source root with canvaskit/ copied in.
export async function verifyCanvasKitFonts() {
  const results = [];
  for (const renderer of ['generic', 'chromium']) {
    const prefix = renderer === 'generic' ? '/canvaskit/' : '/canvaskit/chromium/';
    const { default: init } = await import(`${prefix}canvaskit.js`);
    const ck = await init({ locateFile: file => `${prefix}${file}` });
    for (const name of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold']) {
      const images = [];
      for (const extension of ['ttf', 'woff2']) {
        const response = await fetch(`/assets/fonts/NotoSansTC-${name}.${extension}`);
        if (!response.ok) throw new Error(`Font HTTP ${response.status}: ${name}`);
        const face = ck.Typeface.MakeFreeTypeFaceFromData(await response.arrayBuffer());
        if (!face) throw new Error(`${renderer} rejected ${name}.${extension}`);
        const surface = ck.MakeSurface(900, 180);
        if (!surface) throw new Error('Failed to create raster surface');
        const font = new ck.Font(face, 28);
        const paint = new ck.Paint();
        paint.setColor(ck.BLACK);
        paint.setAntiAlias(true);
        const canvas = surface.getCanvas();
        canvas.clear(ck.WHITE);
        for (const [index, text] of [
          '繁體中文：手機號碼 驗證碼 登入 澳門 香港',
          '简体中文：订单 司机 车辆 收入 验证',
          'English 0123456789 HKD RMB +852 +86',
        ].entries()) canvas.drawText(text, 10, 45 + index * 50, paint, font);
        surface.flush();
        const image = surface.makeImageSnapshot();
        const bytes = image.encodeToBytes();
        if (!bytes) throw new Error('PNG encoding failed');
        images.push(new Uint8Array(bytes));
        image.delete();
        paint.delete();
        font.delete();
        face.delete();
        surface.delete();
      }
      const equal = images[0].length === images[1].length &&
        images[0].every((value, index) => value === images[1][index]);
      if (!equal) throw new Error(`${renderer} rendering differs: ${name}`);
      results.push({ renderer, weight: name, accepted: true, pngBytesEqual: equal });
    }
  }
  return results;
}
