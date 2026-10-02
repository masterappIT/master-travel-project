FROM nginx:1.27-alpine

COPY deploy/frontend/default.conf /etc/nginx/templates/default.conf.template
COPY --from=static / /usr/share/nginx/html

RUN if [ -d /usr/share/nginx/html/assets/assets/fonts ]; then \
      for font in /usr/share/nginx/html/assets/assets/fonts/NotoSansTC-*.ttf; do \
        if [ -f "$font" ]; then gzip -6 -c "$font" > "$font.gz"; fi; \
      done; \
    fi

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1
