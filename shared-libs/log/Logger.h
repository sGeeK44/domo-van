#pragma once
#include <Arduino.h>
#include <stdarg.h>

class Logger
{
public:
  enum Level
  {
    DEBUG = 0,
    INFO = 1
  };

  // construct with a Stream (e.g. Serial)
  Logger(Stream &stream, Level lvl = INFO);

  void setLevel(Level lvl);

  void debug(const char *fmt, ...);
  void info(const char *fmt, ...);
  void warn(const char *fmt, ...);
  void flush();

private:
  Stream *out;
  Level level;
  int maxLogMsgSize = 256;

  void log(const char *tag, const char *fmt, va_list ap);
};
