#include "EmaFilter.h"
#include <gtest/gtest.h>

TEST(EmaFilter, ReturnsInitialValueImmediately) {
  EmaFilter filter(0.5);

  int result = filter.apply(100);

  EXPECT_EQ(result, 100);
}

TEST(EmaFilter, SmoothsValueWithAlphaZeroPointFive) {
  EmaFilter filter(0.5);
  filter.apply(100);

  int result = filter.apply(200);

  EXPECT_EQ(result, 150);
}

TEST(EmaFilter, ResistsChangeWithLowAlpha) {
  EmaFilter filter(0.1);

  filter.apply(100);
  int result = filter.apply(200);

  EXPECT_EQ(result, 110);
}

TEST(EmaFilter, ConvergesToConstantInput) {
  EmaFilter filter(0.5);

  filter.apply(0); // Start at 0

  // Apply 100 many times
  for (int i = 0; i < 20; i++) {
    filter.apply(100);
  }

  EXPECT_EQ(filter.apply(100), 100);
}

// if you plan to use GMock, replace the line above with
