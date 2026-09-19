import 'dart:typed_data';

import 'browser_image_picker_stub.dart'
    if (dart.library.html) 'browser_image_picker_web.dart' as platform;

const supportedImageMimeTypes = <String>[
  'image/jpeg',
  'image/png',
  'image/webp',
];

class BrowserImage {
  const BrowserImage({
    required this.bytes,
    required this.fileName,
    required this.mimeType,
    required this.compressed,
  });

  final Uint8List bytes;
  final String fileName;
  final String mimeType;
  final bool compressed;
}

Future<BrowserImage?> pickBrowserImage({
  int maxBytes = 2 * 1024 * 1024,
  int maxDimension = 2048,
}) =>
    platform.pickBrowserImage(
      maxBytes: maxBytes,
      maxDimension: maxDimension,
    );
