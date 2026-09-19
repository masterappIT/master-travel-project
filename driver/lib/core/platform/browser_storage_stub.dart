final Map<String, String> _values = <String, String>{};

String? readBrowserValue(String key) => _values[key];

void writeBrowserValue(String key, String value) => _values[key] = value;

void removeBrowserValue(String key) => _values.remove(key);
