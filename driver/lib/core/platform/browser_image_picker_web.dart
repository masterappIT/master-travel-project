// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

import 'browser_image_picker.dart' show BrowserImage, supportedImageMimeTypes;

Future<BrowserImage?> pickBrowserImage({
  required int maxBytes,
  required int maxDimension,
}) async {
  final input = html.FileUploadInputElement()
    ..accept = supportedImageMimeTypes.join(',')
    ..multiple = false;
  input.style
    ..position = 'fixed'
    ..left = '0'
    ..top = '0'
    ..width = '1px'
    ..height = '1px'
    ..opacity = '0'
    ..zIndex = '2147483647';
  html.document.body?.append(input);
  try {
    final selectionChanged = input.onChange.first;
    input.click();
    await selectionChanged;
    final files = input.files;
    final file = files == null || files.isEmpty ? null : files.first;
    if (file == null) return null;
    if (!supportedImageMimeTypes.contains(file.type)) {
      throw StateError('只支援 JPEG、PNG 或 WebP 圖片');
    }
    final compressed = file.size > maxBytes;
    return BrowserImage(
      bytes: compressed
          ? await _compressImage(file, maxBytes, maxDimension)
          : await _readBlob(file),
      fileName: file.name,
      mimeType: compressed ? 'image/jpeg' : file.type,
      compressed: compressed,
    );
  } finally {
    input.remove();
  }
}

Future<Uint8List> _readBlob(html.Blob blob) {
  final completer = Completer<Uint8List>();
  final reader = html.FileReader();
  reader.onLoad.listen((_) {
    final result = reader.result;
    if (result is ByteBuffer) {
      completer.complete(result.asUint8List());
    } else if (result is Uint8List) {
      completer.complete(result);
    } else {
      completer.completeError(StateError('無法讀取圖片'));
    }
  });
  reader.onError.listen(
    (_) => completer.completeError(StateError('無法讀取圖片')),
  );
  reader.readAsArrayBuffer(blob);
  return completer.future;
}

Future<Uint8List> _compressImage(
  html.File file,
  int maxBytes,
  int maxDimension,
) async {
  final objectUrl = html.Url.createObjectUrl(file);
  try {
    final image = html.ImageElement(src: objectUrl);
    await image.onLoad.first;
    var width = image.naturalWidth;
    var height = image.naturalHeight;
    if (width <= 0 || height <= 0) throw StateError('無法解碼圖片');
    if (width > maxDimension || height > maxDimension) {
      final ratio = maxDimension / (width > height ? width : height);
      width = (width * ratio).round();
      height = (height * ratio).round();
    }
    var quality = 0.88;
    for (var attempt = 0; attempt < 12; attempt++) {
      final canvas = html.CanvasElement(width: width, height: height);
      canvas.context2D
        ..fillStyle = '#FFFFFF'
        ..fillRect(0, 0, width, height)
        ..drawImageScaled(image, 0, 0, width, height);
      final bytes = await _readBlob(await canvas.toBlob('image/jpeg', quality));
      if (bytes.length <= maxBytes) return bytes;
      if (quality > 0.52) {
        quality -= 0.09;
      } else {
        width = (width * 0.82).round();
        height = (height * 0.82).round();
        quality = 0.72;
      }
    }
    throw StateError('圖片壓縮後仍超過 2 MB，請選擇較小的圖片');
  } finally {
    html.Url.revokeObjectUrl(objectUrl);
  }
}
