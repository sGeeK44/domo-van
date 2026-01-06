#include "MedianFilter.h"
#include <gtest/gtest.h>

TEST(MedianFilterTest, ReturnsValueImmediatelyForFirstApply) {
  MedianFilter filter(3);
  int result = filter.apply(100);
  EXPECT_EQ(100, result);
}

TEST(MedianFilterTest, ReturnsMedianAfterBufferFills) {
  MedianFilter filter(3);
  filter.apply(100);
  filter.apply(200);
  int result = filter.apply(150);
  EXPECT_EQ(150, result);
}

TEST(MedianFilterTest, ContinuesUpdatingMedian) {
  MedianFilter filter(3);
  filter.apply(100);
  filter.apply(200);
  filter.apply(150);
  int result = filter.apply(300);
  EXPECT_EQ(200, result);
}

TEST(MedianFilterTest, HandlesEvenWindowSize) {
  MedianFilter filter(4);
  filter.apply(1);
  filter.apply(2);
  filter.apply(3);
  int result = filter.apply(4);
  EXPECT_EQ(3, result);
}

TEST(MedianFilterTest, WindowSizeOneReturnsInput) {
  MedianFilter filter(1);
  int result = filter.apply(42);
  EXPECT_EQ(42, result);
}