# Campus Monde — image PHP 8.3 + Apache (Railway, Render, tout hébergeur Docker)
FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql && a2enmod rewrite headers
# Un seul MPM pour Apache (corrige « AH00534: More than one MPM loaded »)
RUN a2dismod -f mpm_event mpm_worker || true; a2enmod mpm_prefork
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
 && sed -ri 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
 && printf '<Directory /var/www/html/public>\n  AllowOverride All\n  Require all granted\n</Directory>\nServerTokens Prod\nServerSignature Off\n' > /etc/apache2/conf-enabled/campusmonde.conf \
 && printf 'upload_max_filesize=6M\npost_max_size=8M\nexpose_php=Off\nlog_errors=On\nerror_log=/dev/stderr\n' > /usr/local/etc/php/conf.d/campusmonde.ini
COPY . /var/www/html/
RUN rm -f /var/www/html/.env && mkdir -p /var/www/html/storage/documents && chown -R www-data:www-data /var/www/html/storage
# Railway fournit le port dans $PORT
CMD ["sh", "-c", "rm -f /etc/apache2/mods-enabled/mpm_event.* /etc/apache2/mods-enabled/mpm_worker.* && sed -ri \"s/Listen 80$/Listen ${PORT:-80}/\" /etc/apache2/ports.conf && sed -ri \"s/:80>/:${PORT:-80}>/\" /etc/apache2/sites-available/000-default.conf && mkdir -p ${STORAGE_DIR:-/var/www/html/storage/documents} && chown -R www-data:www-data ${STORAGE_DIR:-/var/www/html/storage/documents} && apache2-foreground"]
