#include "Program.h"
#include "EmaFilter.h"
#include "InputSignal.h"
#include "Logger.h"
#include "MedianFilter.h"
#include "UltrasonicSensor.h"
#include <Arduino.h>

void Program::setup(Stream &serial, Stream &serial2) {
  logger = new Logger(serial, Logger::INFO);
  logger->info("--- Starting water module ---");
  sensor = new UltrasonicSensor(serial2, logger);
  input = new InputSignal(sensor);
  input->addFilter(new MedianFilter(9));
  input->addFilter(new EmaFilter(0.5));
  logger->info("--- Setup done ---");
}

void Program::loop() {
  int distance = input->read();
  if (distance < 0) {
    logger->debug("Sensor not available yet");
    return;
  }
  logger->info("Distance: %d mm", distance);
  delay(110);
}
