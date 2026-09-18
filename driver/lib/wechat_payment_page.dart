import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

import 'package:flutter/material.dart';

import 'core/api/driver_api_client.dart';
import 'core/layout/driver_page_shell.dart';
import 'core/tokens/driver_tokens.dart';

class WechatPaymentPage extends StatefulWidget {
  const WechatPaymentPage({super.key});

  @override
  State<WechatPaymentPage> createState() => _WechatPaymentPageState();
}

class _WechatPaymentPageState extends State<WechatPaymentPage> {
  final _api = DriverApiClient.instance;
  final _wechatIdController = TextEditingController();
  Uint8List? _qrCodeBytes;
  String _fileName = 'wechat-qr-code.jpg';
  String _mimeType = 'image/jpeg';
  String? _existingQrCodeUrl;
  bool _loading = true;
  bool _saving = false;
  bool _selecting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _wechatIdController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final driver = await _api.me();
      if (!mounted) return;
      setState(() {
        _wechatIdController.text = driver['wechatId']?.toString() ?? '';
        final url = driver['wechatQrCodeUrl']?.toString();
        _existingQrCodeUrl = url == null ? null : '${_api.baseUrl}$url';
        _loading = false;
      });
    } on DriverApiException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    }
  }

  Future<void> _selectQrCode() async {
    if (_selecting) return;
    final input = html.FileUploadInputElement()
      ..accept = 'image/jpeg,image/png,image/webp'
      ..multiple = false;
    input.style
      ..position = 'fixed'
      ..left = '0'
      ..top = '0'
      ..width = '1px'
      ..height = '1px'
      ..opacity = '0';
    html.document.body?.append(input);
    try {
      setState(() => _selecting = true);
      final changed = input.onChange.first;
      input.click();
      await changed;
      final files = input.files;
      final file = files == null || files.isEmpty ? null : files.first;
      if (file == null) return;
      if (!const ['image/jpeg', 'image/png', 'image/webp']
          .contains(file.type)) {
        throw StateError('只支援 JPEG、PNG 或 WebP 圖片');
      }
      final compressed = file.size > 2 * 1024 * 1024;
      final bytes =
          compressed ? await _compressQrCode(file) : await _readFile(file);
      if (!mounted) return;
      setState(() {
        _qrCodeBytes = bytes;
        _fileName = compressed ? 'wechat-qr-code.jpg' : file.name;
        _mimeType = compressed ? 'image/jpeg' : file.type;
      });
    } on Object catch (error) {
      if (mounted) {
        setState(() => _error = error is StateError ? error.message : '圖片處理失敗');
      }
    } finally {
      input.remove();
      if (mounted) setState(() => _selecting = false);
    }
  }

  Future<Uint8List> _readFile(html.File file) async {
    final reader = html.FileReader();
    final done = reader.onLoad.first;
    reader.readAsArrayBuffer(file);
    await done;
    final result = reader.result;
    if (result is ByteBuffer) return Uint8List.view(result);
    if (result is Uint8List) return result;
    throw StateError('無法讀取圖片');
  }

  Future<Uint8List> _readBlob(html.Blob blob) {
    final completer = Completer<Uint8List>();
    final reader = html.FileReader();
    reader.onLoad.listen((_) {
      final result = reader.result;
      if (result is ByteBuffer) {
        completer.complete(Uint8List.view(result));
      } else if (result is Uint8List) {
        completer.complete(result);
      } else {
        completer.completeError(StateError('無法讀取壓縮圖片'));
      }
    });
    reader.onError.listen((_) => completer.completeError(
          StateError('無法讀取壓縮圖片'),
        ));
    reader.readAsArrayBuffer(blob);
    return completer.future;
  }

  Future<Uint8List> _compressQrCode(html.File file) async {
    const maxBytes = 2 * 1024 * 1024;
    final objectUrl = html.Url.createObjectUrl(file);
    try {
      final image = html.ImageElement(src: objectUrl);
      await image.onLoad.first;
      var width = image.naturalWidth;
      var height = image.naturalHeight;
      if (width <= 0 || height <= 0) throw StateError('無法解碼圖片');
      const maxDimension = 2048;
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
        final blob = await canvas.toBlob('image/jpeg', quality);
        final bytes = await _readBlob(blob);
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

  Future<void> _save() async {
    final wechatId = _wechatIdController.text.trim();
    if (wechatId.isEmpty) {
      setState(() => _error = '請填寫微信 ID');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final driver = await _api.updateWechatPayment(
        wechatId: wechatId,
        qrCodeBytes: _qrCodeBytes,
        fileName: _fileName,
        mimeType: _mimeType,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('微信支付設定已儲存')));
      Navigator.of(context).pop(driver);
    } on DriverApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DriverPageShell(
      selectedIndex: 2,
      showBottomNavigation: false,
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                IconButton(
                    tooltip: '返回',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back_rounded)),
                const Expanded(
                    child: Text('微信支付',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: DriverTypography.bodyLarge,
                            fontWeight: FontWeight.w700,
                            color: DriverColors.text))),
                const SizedBox(width: 48),
              ]),
              const SizedBox(height: DriverSpacing.xl),
              const Text('微信收款設定',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
              const SizedBox(height: DriverSpacing.sm),
              const Text('填寫微信 ID 並上傳收款碼，方便乘客完成付款。',
                  style: TextStyle(
                      fontSize: DriverTypography.body,
                      color: DriverColors.secondaryText)),
              const SizedBox(height: DriverSpacing.xl),
              TextField(
                  controller: _wechatIdController,
                  enabled: !_saving,
                  decoration: const InputDecoration(
                      labelText: '微信 ID',
                      hintText: '請填寫微信 ID',
                      border: OutlineInputBorder())),
              const SizedBox(height: DriverSpacing.lg),
              const Text('收款碼',
                  style: TextStyle(
                      fontSize: DriverTypography.bodyLarge,
                      fontWeight: FontWeight.w700,
                      color: DriverColors.text)),
              const SizedBox(height: DriverSpacing.sm),
              if (_qrCodeBytes != null)
                Image.memory(_qrCodeBytes!, height: 220, fit: BoxFit.contain)
              else if (_existingQrCodeUrl != null)
                Image.network(_existingQrCodeUrl!,
                    height: 220,
                    fit: BoxFit.contain,
                    headers: {'Authorization': 'Bearer ${_api.token}'}),
              const SizedBox(height: DriverSpacing.sm),
              OutlinedButton.icon(
                  onPressed: _saving ? null : _selectQrCode,
                  icon: const Icon(Icons.upload_file_rounded),
                  label: Text(_selecting ? '讀取中...' : '上傳收款碼')),
              if (_error != null) ...[
                const SizedBox(height: DriverSpacing.md),
                Text(_error!,
                    style: const TextStyle(color: DriverColors.warningText)),
              ],
              const SizedBox(height: DriverSpacing.xl),
              SizedBox(
                  height: 48,
                  child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: Text(_saving ? '儲存中...' : '儲存設定'))),
            ]),
    );
  }
}
