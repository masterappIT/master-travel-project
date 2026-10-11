FROM nginx:1.27-alpine

RUN apk add --no-cache brotli

COPY deploy/frontend/default.conf /etc/nginx/templates/default.conf.template
COPY --from=static / /usr/share/nginx/html

RUN if [ -d /usr/share/nginx/html/assets/assets/fonts ]; then \
      for font in /usr/share/nginx/html/assets/assets/fonts/NotoSansTC-*.ttf; do \
        if [ -f "$font" ]; then \
          gzip -6 -c "$font" > "$font.gz"; \
          brotli -q 11 -c "$font" > "$font.br"; \
        fi; \
      done; \
    fi

RUN if [ -d /usr/share/nginx/html/canvaskit ]; then \
      find /usr/share/nginx/html/canvaskit -type f -name '*.wasm' \
        -exec sh -c 'gzip -6 -c "$1" > "$1.gz" && brotli -q 11 -c "$1" > "$1.br"' sh {} \; ; \
    fi

RUN if [ -f /usr/share/nginx/html/main.dart.js ]; then \
      gzip -6 -c /usr/share/nginx/html/main.dart.js > /usr/share/nginx/html/main.dart.js.gz; \
      brotli -q 11 -c /usr/share/nginx/html/main.dart.js > /usr/share/nginx/html/main.dart.js.br; \
    fi

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
