#include <ApplicationServices/ApplicationServices.h>
#include <stdio.h>

int main(void) {
  double x;
  double y;
  while (scanf("%lf %lf", &x, &y) == 2) {
    CGEventRef event = CGEventCreateMouseEvent(NULL, kCGEventMouseMoved,
                                               CGPointMake(x, y),
                                               kCGMouseButtonLeft);
    if (event != NULL) {
      CGEventPost(kCGHIDEventTap, event);
      CFRelease(event);
    }
  }
  return 0;
}
