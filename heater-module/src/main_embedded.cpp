#include "Arduino.h"
#include "Esp32Settings.h"
#include "Program.h"

// Rates for serial communication
#define STANDARD_BAUD 9600

static Program program(new Esp32Settings("wt-settings"));

void setup() {
  Serial.begin(STANDARD_BAUD);
  program.setup(Serial);
}

void loop() { program.loop(); }
