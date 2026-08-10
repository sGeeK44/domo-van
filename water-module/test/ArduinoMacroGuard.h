#pragma once
// ArduinoFake's <Arduino.h> defines round() and abs() as function-like macros.
// libstdc++ 13 declares std::chrono::round<duration<R, P>>() and abs(duration<R, P>),
// whose template argument list the preprocessor reads as two macro arguments. Any
// translation unit reaching <chrono> after <Arduino.h> then fails to compile, which is
// every test pulling in <gtest/gtest.h>. Include this instead of <Arduino.h>.
#include <Arduino.h>

#undef round
#undef abs
