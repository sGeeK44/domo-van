#include "Logger.h"

Logger::Logger(Stream &stream, Level lvl) : out(&stream), level(lvl), maxLogMsgSize(256) {}

void Logger::setLevel(Level lvl) { level = lvl; }

void Logger::debug(const char *fmt, ...) {
  if (level > DEBUG)
    return;
  va_list ap;
  va_start(ap, fmt);
  log("DEBUG", fmt, ap);
  va_end(ap);
}

void Logger::info(const char *fmt, ...) {
  if (level > INFO)
    return;
  va_list ap;
  va_start(ap, fmt);
  log("INFO", fmt, ap);
  va_end(ap);
}

void Logger::log(const char *tag, const char *fmt, va_list ap) {
  char buf[Logger::maxLogMsgSize];
  vsnprintf(buf, sizeof(buf), fmt, ap);
  out->write((const uint8_t *)"\n[", 2);
  out->write((const uint8_t *)tag, strlen(tag));
  out->write((const uint8_t *)"] ", 2);
  out->write((const uint8_t *)buf, strlen(buf));
}
